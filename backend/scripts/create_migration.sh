if [ -z "$1" ]; then
    echo "❌ 錯誤：請輸入遷移說明"
    echo "用法：./scripts/create_migration.sh \"說明文字\""
    echo "範例：./scripts/create_migration.sh \"add phone column\""
    exit 1
fi

cd "$(dirname "$0")/.."

echo "🔍 正在比對 models.py 與資料庫的差異..."
python3 -m alembic revision --autogenerate -m "$1"

echo "✅ 遷移檔 (Migration Script) 已產生！"
echo "📂 位置：backend/alembic/versions/"
echo "💡 下一步：請執行 ./scripts/update_local_db.sh 來更新本地資料庫"