from bson import ObjectId
from datetime import datetime, date

def serialize_mongo(obj):
    if isinstance(obj, ObjectId):
        return str(obj)
    if isinstance(obj, (datetime, date)):
        return obj.isoformat()
    if isinstance(obj, dict):
        return {k: serialize_mongo(v) for k, v in obj.items()}
    if isinstance(obj, (list, tuple, set)):
        return [serialize_mongo(item) for item in obj]
    return obj

