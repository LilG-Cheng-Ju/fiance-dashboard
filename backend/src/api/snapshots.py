import os
from datetime import date, timedelta
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Header, Query
from sqlalchemy.orm import Session

from src import database, models, schemas
from src.dependencies.auth import get_current_user
from src.services.snapshot_service import SnapshotService

router = APIRouter(prefix="/snapshots", tags=["Snapshots"])

# --- Write Endpoint (for Scheduler) ---

CRON_SECRET = os.getenv("CRON_SECRET", "my-secret-key-123")

@router.post("/capture-all", summary="Trigger daily snapshot for all users")
def trigger_daily_snapshot(
    target_date: Optional[date] = Query(None, description="Force snapshot for specific date (YYYY-MM-DD). Defaults to yesterday."),
    x_cron_secret: str = Header(None),
    db: Session = Depends(database.get_db)
):
    """
    [Protected] Triggered by Cloud Scheduler to generate daily snapshots for all users.
    """
    if x_cron_secret != CRON_SECRET:
        raise HTTPException(status_code=403, detail="Invalid Cron Secret")

    users = db.query(models.User).all()
    results = []
    
    snapshot_date = target_date if target_date else (date.today() - timedelta(days=1))
    
    print(f"Starting daily snapshot for {len(users)} users...")

    for user in users:
        try:
            net_worth = SnapshotService.create_daily_snapshot(db, user.uid, snapshot_date)
            results.append({"uid": user.uid, "status": "success", "net_worth": net_worth})
        except Exception as e:
            print(f"Failed snapshot for user {user.uid}: {e}")
            results.append({"uid": user.uid, "status": "failed", "error": str(e)})

    print("Daily snapshot completed.")
    return {"message": "Batch snapshot completed", "details": results}


# --- Read Endpoint (for Frontend) ---

@router.get("", response_model=List[schemas.AssetSnapshotResponse], summary="Get historical snapshots for trend chart")
def get_snapshots(
    start_date: Optional[date] = Query(None, description="Start date in YYYY-MM-DD format"),
    end_date: Optional[date] = Query(None, description="End date in YYYY-MM-DD format"),
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Fetch historical asset snapshots for the authenticated user to display on a trend chart.
    Defaults to the last 365 days if no date range is provided.
    """
    if not end_date:
        end_date = date.today()
    if not start_date:
        start_date = end_date - timedelta(days=365)

    snapshots = db.query(models.AssetSnapshot).filter(
        models.AssetSnapshot.user_id == current_user.uid,
        models.AssetSnapshot.snapshot_date >= start_date,
        models.AssetSnapshot.snapshot_date <= end_date
    ).order_by(models.AssetSnapshot.snapshot_date.asc()).all()
    
    return snapshots
