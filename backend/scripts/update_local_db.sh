cd "$(dirname "$0")/.."

echo "🔄 正在更新本地資料庫 (SQLite)..."
python3 -m alembic upgrade head

echo "✅ 本地資料庫已更新至最新版本！"