import json
import os
from gokite import KiteClient


def main():
    """
    这个脚本用于展示 KitePass（Agent Passport / API Key）身份接入的最小闭环：
    - 用 KITE_API_KEY 初始化 KiteClient
    - 拉取 service info（给 LLM/评委看）
    - 可选：调用一次 service（会走 Kite 的预授权支付流程，具体计费由平台侧处理）
    """

    api_key = os.environ.get("KITE_API_KEY")
    if not api_key:
        raise SystemExit("缺少环境变量 KITE_API_KEY（从 KitePass 页面复制的 api_key_...）")

    service_id = os.environ.get("KITE_SERVICE_ID", "").strip()
    payload_json = os.environ.get("KITE_PAYLOAD_JSON", "").strip()
    verbose = os.environ.get("KITE_VERBOSE", "0") in ("1", "true", "TRUE")

    client = KiteClient(api_key=api_key, verbose=verbose)

    if not service_id:
        print("未提供 KITE_SERVICE_ID：跳过 service 调用，只验证 KitePass API Key 初始化成功。")
        print("提示：在 https://app.gokite.ai/ 复制某个 service 的 ID，然后设置 KITE_SERVICE_ID 再运行。")
        return

    print("--- KitePass identity demo (Python) ---")
    print("service_id:", service_id)

    info = client.get_service_info(service_id=service_id)
    print("\n[service_info]\n")
    print(info)

    if not payload_json:
        print("\n未提供 KITE_PAYLOAD_JSON：不发起实际调用。")
        print("提示：设置 KITE_PAYLOAD_JSON='{\"key\":\"value\"}' 再运行，以触发一次 call_service。")
        return

    payload = json.loads(payload_json)
    resp = client.call_service(service_id=service_id, payload=payload)
    print("\n[call_service response]\n")
    print(resp)


if __name__ == "__main__":
    main()

