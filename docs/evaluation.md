## Evaluation


### Retrieval Evaluation


Databricks AI Search の検索品質を Recall / Precision で評価しています。


\| 設定                              | Recall | Precision |

\| --------------------------------- | -----: | --------: |

\| Top-K = 5                         |   1.00 |      0.59 |

\| Top-K = 3                         |   1.00 |      0.67 |

\| Top-K = 3 + `documentType` filter |   1.00 |      0.76 |


Metadata Filter によって、

Recall を維持しながら Precision が改善することを確認しました。


### Chunk Size Comparison


\| Chunk Size | Overlap | Recall | Precision |

\| ---------: | ------: | -----: | --------: |

\|        500 |     100 |   0.97 |      0.78 |

\|       1000 |     200 |   0.92 |      0.72 |


現在の評価データでは、


```text

chunkSize = 500

overlap = 100

```


の方が Recall / Precision ともに高い結果となりました。


---

---

## Evaluation Commands


### RAG Evaluation


```bash

pnpm rag:evaluate

```


### Monthly Report Evaluation


```bash

pnpm rag:evaluate-monthly-report

```


Monthly Report Evaluation では現在、


```text

Extraction Eval

Tool Selection Eval

Answer Eval

Groundedness Eval

```


を実行します。


---
