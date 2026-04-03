from __future__ import annotations

import os

import httpx

from .contracts import CrossmintOrderRequest, CrossmintOrderResponse


def normalize_product_locator(input_value: str) -> str:
    trimmed = input_value.strip()
    if not trimmed:
        return ""

    if trimmed.startswith(("amazon:", "shopify:", "url:")):
        return trimmed

    if "amazon." in trimmed.lower():
        return f"amazon:{trimmed}"

    return f"url:{trimmed}"


def get_crossmint_base_url() -> str:
    return os.getenv(
        "CROSSMINT_API_BASE_URL",
        "https://staging.crossmint.com/api/2022-06-09",
    ).rstrip("/")


async def create_crossmint_order(
    input_value: CrossmintOrderRequest,
) -> CrossmintOrderResponse:
    api_key = os.getenv("CROSSMINT_SERVER_API_KEY")
    if not api_key:
        raise ValueError("CROSSMINT_SERVER_API_KEY is not configured")

    request = input_value.model_copy(
        update={"productLocator": normalize_product_locator(input_value.productLocator)}
    )

    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(
            f"{get_crossmint_base_url()}/orders",
            headers={
                "Content-Type": "application/json",
                "X-API-KEY": api_key,
            },
            json={
                "recipient": request.recipient.model_dump(exclude_none=True),
                "locale": request.locale,
                "payment": {
                    "receiptEmail": request.recipient.email,
                    "method": "basis-theory",
                },
                "lineItems": [
                    {
                        "productLocator": request.productLocator,
                        **({"maxPrice": request.maxPrice} if request.maxPrice else {}),
                    }
                ],
            },
        )

    payload = response.json() if response.content else {}
    if response.is_error:
        if isinstance(payload, dict) and isinstance(payload.get("message"), str):
            raise ValueError(payload["message"])
        raise ValueError(f"Crossmint returned {response.status_code}")

    order = payload.get("order", {}) if isinstance(payload, dict) else {}
    payment = order.get("payment", {}) if isinstance(order, dict) else {}
    return CrossmintOrderResponse(
        orderId=str(order.get("orderId", "")),
        phase=str(order.get("phase", "")),
        paymentStatus=payment.get("status") if isinstance(payment, dict) else None,
    )
