#!/usr/bin/env python3
"""Run the FastAPI webapp server."""

import uvicorn

if __name__ == "__main__":
    uvicorn.run("api:app", host="127.0.0.1", port=8001, reload=True)

