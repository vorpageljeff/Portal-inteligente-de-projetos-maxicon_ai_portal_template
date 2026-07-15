import json
from typing import Any

from sqlalchemy.orm import Session

from app.models.operations import AuditLog
from app.models.security import User


def audit(
    db: Session,
    *,
    actor: User | None,
    action: str,
    entity_type: str,
    entity_id: str,
    before: Any = None,
    after: Any = None,
) -> None:
    db.add(
        AuditLog(
            actor=actor.email if actor else "system",
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            before_value=json.dumps(before, default=str) if before is not None else None,
            after_value=json.dumps(after, default=str) if after is not None else None,
        )
    )
