import uuid
from datetime import datetime
from typing import List

from fastapi import HTTPException
from sqlalchemy.orm import Session
from src import models


class FriendCodeService:

    @staticmethod
    def _generate_code() -> str:
        """Generates a unique, human-readable code like G-FRIEND-1A2B3C4D."""
        random_part = str(uuid.uuid4()).upper().split('-')[0]
        return f"G-FRIEND-{random_part}"

    @staticmethod
    def get_all_codes(db: Session) -> List[models.FriendCode]:
        """
        Retrieves all friend codes, ordering by creation date.
        """
        return db.query(models.FriendCode).order_by(models.FriendCode.created_at.desc()).all()

    @staticmethod
    def create_friend_codes(db: Session, count: int) -> List[models.FriendCode]:
        """
        Generates and stores a specified number of unique friend codes.
        """
        if not (0 < count <= 20):
            raise HTTPException(status_code=400, detail="Count must be between 1 and 20.")

        new_codes_obj = []
        for _ in range(count):
            # Loop to ensure code is unique, although collision is highly unlikely
            while True:
                code_str = FriendCodeService._generate_code()
                exists = db.query(models.FriendCode).filter(models.FriendCode.code == code_str).first()
                if not exists:
                    break
            
            db_code = models.FriendCode(code=code_str)
            db.add(db_code)
            new_codes_obj.append(db_code)
            
        db.commit()
        for code in new_codes_obj:
            db.refresh(code) # Refresh to get DB-generated values like ID and created_at
            
        return new_codes_obj

    @staticmethod
    def mark_prompt_seen(db: Session, user: models.User) -> models.User:
        """Marks that the user has seen the friend code prompt."""
        user.has_seen_friend_code_prompt = True
        db.commit()
        db.refresh(user)
        return user

    @staticmethod
    def redeem_code(db: Session, user: models.User, code_str: str) -> models.User:
        """Validates and redeems a friend code for a user."""
        # 1. Check if user already has an elevated role
        if user.role in [models.UserRole.FRIEND, models.UserRole.ADMIN, models.UserRole.OWNER]:
            raise HTTPException(status_code=400, detail="您的權限已是小G之友或更高，無需兌換。")

        # 2. Find the code
        code = db.query(models.FriendCode).filter(models.FriendCode.code == code_str).first()
        if not code:
            raise HTTPException(status_code=404, detail="無效的序號。")
        if code.is_used:
            raise HTTPException(status_code=400, detail="此序號已被使用。")

        # 3. Redeem it
        code.is_used = True
        code.used_by_uid = user.uid
        code.used_at = datetime.now()
        user.role = models.UserRole.FRIEND
        db.commit()
        db.refresh(user)
        return user