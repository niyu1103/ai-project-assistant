import json
import os
from pathlib import Path

import pandas as pd
import requests
from dotenv import load_dotenv


ROOT = Path(__file__).resolve().parent.parent

load_dotenv(ROOT / ".env.local")

TOP_K = 3


def load_json(path: Path):
    with path.open("r", encoding="utf-8") as f:
        return json.load(f)


def find_customer_id(customer_name: str | None, customers: list[dict]):
    if not customer_name:
        return None

    for customer in customers:
        if (
            customer_name in customer["name"]
            or customer_name in customer["shortName"]
        ):
            return customer["id"]

    return None


def search_databricks_documents(
    query: str,
    num_results: int = 3,
    customer_id: str | None = None,
    document_type: str | None = None,
):
    host = os.environ["DATABRICKS_HOST"]
    token = os.environ["DATABRICKS_TOKEN"]
    index_name = os.environ["DATABRICKS_INDEX_NAME"]

    url = (
        f"{host}/api/2.0/vector-search/indexes/"
        f"{requests.utils.quote(index_name, safe='')}/query"
    )

    filters = {}

    if customer_id:
        filters["customer_id"] = customer_id

    if document_type:
        filters["document_type"] = document_type

    payload = {
        "query_text": query,
        "query_type": "HYBRID",
        "num_results": num_results,
        "columns": [
            "content",
            "file",
            "customer_id",
            "document_type",
        ],
    }

    if filters:
        payload["filters_json"] = json.dumps(
            filters,
            ensure_ascii=False,
        )

    response = requests.post(
        url,
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        },
        json=payload,
        timeout=30,
    )

    response.raise_for_status()

    data = response.json()

    columns = [
        column["name"]
        for column in data.get("manifest", {}).get("columns", [])
    ]

    rows = data.get("result", {}).get("data_array", [])

    results = []

    for row in rows:
        record = dict(zip(columns, row))

        results.append(
            {
                "content": record.get("content", ""),
                "file": record.get("file", ""),
                "customer_id": record.get("customer_id"),
                "document_type": record.get("document_type", ""),
                "score": float(record.get("score", 0) or 0),
            }
        )

    return results


def main():
    cases = load_json(
        ROOT / "data" / "rag-evaluation-cases.json"
    )

    customers = load_json(
        ROOT / "data" / "customers.json"
    )

    evaluation_results = []

    for test_case in cases:
        customer_id = find_customer_id(
            test_case.get("customerName"),
            customers,
        )

        search_results = search_databricks_documents(
            query=test_case["query"],
            num_results=TOP_K,
            customer_id=customer_id,
            document_type=test_case.get("documentType"),
        )

        actual_files = list(
            dict.fromkeys(
                result["file"]
                for result in search_results
            )
        )

        expected_files = test_case["expectedFiles"]

        matched_files = [
            file
            for file in expected_files
            if file in actual_files
        ]

        recall = (
            1
            if len(expected_files) == 0
            else len(matched_files) / len(expected_files)
        )

        precision = (
            0
            if len(actual_files) == 0
            else len(matched_files) / len(actual_files)
        )

        evaluation_results.append(
            {
                "id": test_case["id"],
                "query": test_case["query"],
                "expectedFiles": ", ".join(expected_files),
                "actualFiles": ", ".join(actual_files),
                "matched": f"{len(matched_files)}/{len(expected_files)}",
                "recall": recall,
                "precision": precision,
            }
        )

    df = pd.DataFrame(evaluation_results)

    print(df.to_string(index=False))

    print()
    print(f"Top-K: {TOP_K}")
    print(f"Average recall: {df['recall'].mean():.2f}")
    print(f"Average precision: {df['precision'].mean():.2f}")


if __name__ == "__main__":
    main()