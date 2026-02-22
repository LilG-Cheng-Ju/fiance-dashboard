import os
from datetime import datetime
from typing import Optional, Dict, Any, List
from sqlalchemy import desc, asc, case
from sqlalchemy.orm import Session
from src import models

OWNER_EMAILS = set(e.strip() for e in os.getenv("OWNER_EMAILS", "").split(",") if e.strip())
ADMIN_EMAILS = set(e.strip() for e in os.getenv("ADMIN_EMAILS", "").split(",") if e.strip())

class UserService:
    
    @staticmethod
    def get_user(db: Session, uid: str) -> Optional[models.User]:
        """Retrieve a user by their Firebase UID."""
        return db.query(models.User).filter(models.User.uid == uid).first()

    @staticmethod
    def get_users(
        db: Session, 
        skip: int = 0, 
        limit: int = 20, 
        email_query: Optional[str] = None,
        role: Optional[models.UserRole] = None,
        sort_by: str = "created_at",
        descending: bool = True
    ) -> List[models.User]:
        """
        Retrieve a list of users with pagination, search, filtering, and sorting.
        """
        query = db.query(models.User)
        
        if email_query:
            # Case-insensitive search for email
            query = query.filter(models.User.email.ilike(f"%{email_query}%"))
        
        if role:
            query = query.filter(models.User.role == role)
            
        if sort_by == 'role':
            # Define priority: Owner(1) -> Admin(2) -> Friend(3) -> Paid(4) -> User(5)
            role_order = case(
                (models.User.role == models.UserRole.OWNER, 1),
                (models.User.role == models.UserRole.ADMIN, 2),
                (models.User.role == models.UserRole.FRIEND, 3),
                (models.User.role == models.UserRole.PAID, 4),
                (models.User.role == models.UserRole.USER, 5),
                else_=6
            )
            # If descending=True, we reverse (User -> Owner). Default should be Ascending (Owner -> User).
            query = query.order_by(desc(role_order) if descending else asc(role_order))
            # Secondary sort: Last Login (Most recent first)
            query = query.order_by(desc(models.User.last_login_at))
        else:
            sort_column = getattr(models.User, sort_by, models.User.created_at)
            query = query.order_by(desc(sort_column) if descending else asc(sort_column))
            
        return query.offset(skip).limit(limit).all()

    @staticmethod
    def determine_role(email: Optional[str]) -> models.UserRole:
        """
        Determine the appropriate user role based on the email address
        and server configuration (Environment Variables).
        """
        if not email:
            return models.UserRole.USER
            
        if email in ADMIN_EMAILS:
            return models.UserRole.ADMIN
        if email in OWNER_EMAILS:
            return models.UserRole.OWNER
            
        return models.UserRole.USER

    @staticmethod
    def create_user(db: Session, uid: str, email: Optional[str], role: models.UserRole) -> models.User:
        """Create and persist a new user."""
        user = models.User(
            uid=uid,
            email=email,
            role=role,
            last_login_at=datetime.now()
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        return user

    @staticmethod
    def update_user(db: Session, uid: str, updates: Dict[str, Any]) -> Optional[models.User]:
        """
        Update user information (e.g., Role).
        """
        user = UserService.get_user(db, uid)
        if not user:
            return None

        for key, value in updates.items():
            if hasattr(user, key):
                setattr(user, key, value)
        
        db.commit()
        db.refresh(user)
        return user

    @staticmethod
    def record_login(db: Session, user: models.User, target_role: models.UserRole) -> models.User:
        """
        Record the login time and perform JIT provisioning if necessary.
        """
        user.last_login_at = datetime.now()
        
        if target_role != models.UserRole.USER and user.role != target_role:
            user.role = target_role
            
        db.commit()
        db.refresh(user)
        return user

    @classmethod
    def get_or_create_user(cls, db: Session, uid: str, email: Optional[str]) -> models.User:
        """
        Main entry point for authentication flow.
        1. Checks if user exists.
        2. Determines role based on config.
        3. Creates new user or updates existing one.
        """
        user = cls.get_user(db, uid)
        target_role = cls.determine_role(email)

        if not user:
            return cls.create_user(db, uid, email, target_role)
        else:
            return cls.record_login(db, user, target_role)

    @staticmethod
    def delete_user(db: Session, uid: str) -> bool:
        """
        Delete a user and all associated data (Assets, Transactions).
        Returns True if deleted, False if user not found.
        """
        user = db.query(models.User).filter(models.User.uid == uid).first()
        if not user:
            return False

        # Delete Transactions
        db.query(models.Transaction).filter(models.Transaction.user_id == uid).delete()

        # Delete Assets
        db.query(models.Asset).filter(models.Asset.user_id == uid).delete()

        # Delete User
        db.delete(user)
        
        db.commit()
        return True
