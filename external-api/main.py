from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from uuid import uuid4

app = FastAPI(
    title="External Customer API",
    version="1.0.0",
)


CUSTOMER_USAGE = {
    "cust-001": {
        "customerId": "cust-001",
        "customerName": "青空テック",
        "monthlyApiRequests": 128000,
        "previousMonthApiRequests": 102000,
        "usageIncreaseRate": 0.255,
        "planLimit": 150000,
        "usageRate": 0.853,
        "status": "warning",
    },
    "cust-002": {
        "customerId": "cust-002",
        "customerName": "北斗リテール",
        "monthlyApiRequests": 42000,
        "previousMonthApiRequests": 40000,
        "usageIncreaseRate": 0.05,
        "planLimit": 100000,
        "usageRate": 0.42,
        "status": "normal",
    },
    "cust-003": {
        "customerId": "cust-003",
        "customerName": "みらい物流",
        "monthlyApiRequests": 76000,
        "previousMonthApiRequests": 72000,
        "usageIncreaseRate": 0.056,
        "planLimit": 120000,
        "usageRate": 0.633,
        "status": "normal",
    },
}


@app.get("/customers/{customer_id}/api-usage")
def get_api_usage(customer_id: str):
    usage = CUSTOMER_USAGE.get(customer_id)

    if not usage:
        raise HTTPException(
            status_code=404,
            detail="Customer not found",
        )

    return usage

class ApiLimitRequest(BaseModel):
    customerId: str
    requestedLimit: int
    reason: str


API_LIMIT_REQUESTS = []


@app.post("/api-limit-requests")
def create_api_limit_request(request: ApiLimitRequest):
    result = {
        "requestId": str(uuid4()),
        "customerId": request.customerId,
        "requestedLimit": request.requestedLimit,
        "reason": request.reason,
        "status": "pending",
    }

    API_LIMIT_REQUESTS.append(result)

    return result