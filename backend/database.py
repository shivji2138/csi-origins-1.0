import os
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from dotenv import load_dotenv

load_dotenv()

backend_dir = os.path.dirname(os.path.abspath(__file__))
default_db_path = os.path.abspath(os.path.join(backend_dir, "agora.db")).replace("\\", "/")
default_url = f"sqlite:///{default_db_path}"

DATABASE_URL = os.getenv("DATABASE_URL", default_url)
if DATABASE_URL.startswith("sqlite"):
    DATABASE_URL = default_url

connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()
