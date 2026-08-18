from pydantic import BaseModel


class PhotoResponse(BaseModel):
    url: str
    type: str