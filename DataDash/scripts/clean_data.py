import pandas as pd
import numpy as np
from pathlib import Path
from pandas.errors import EmptyDataError

BASE_DIR = Path(__file__).resolve().parent.parent
RAW = BASE_DIR / "data" / "raw"
PROCESSED = BASE_DIR / "data" / "processed"


def load_csv(file_path):
    try:
        return pd.read_csv(file_path)
    except FileNotFoundError:
        raise FileNotFoundError(f"{file_path} not found")
    except EmptyDataError:
        raise ValueError(f"{file_path} is empty")


def parse_date(val):
    for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%m-%d-%Y"):
        try:
            return pd.to_datetime(val, format=fmt)
        except Exception:
            continue
    return pd.NaT


# ----------------------------
# CLEAN CUSTOMERS
# ----------------------------
def clean_customers():
    df = load_csv(RAW / "customers.csv")
    before_rows = len(df)

    # Clean signup_date
    df["signup_date"] = pd.to_datetime(df["signup_date"], errors="coerce")

    # Remove duplicates keeping latest signup_date
    df = df.sort_values("signup_date").drop_duplicates(
        subset="customer_id", keep="last"
    )

    # Clean text columns
    df["name"] = df["name"].astype(str).str.strip()
    df["region"] = df["region"].astype(str).str.strip()

    # Fill missing region
    df["region"] = df["region"].replace("", np.nan)
    df["region"] = df["region"].fillna("Unknown")

    # Email standardization
    df["email"] = df["email"].astype(str).str.lower()

    # Better email validation
    df["is_valid_email"] = df["email"].str.match(
        r"^[^@]+@[^@]+\.[^@]+$", na=False
    )

    df.to_csv(PROCESSED / "customers_clean.csv", index=False)

    print("---- Customers Cleaning Report ----")
    print(f"Rows before: {before_rows}")
    print(f"Rows after:  {len(df)}")
    print()


# ----------------------------
# CLEAN ORDERS
# ----------------------------
def clean_orders():
    df = load_csv(RAW / "orders.csv")
    before_rows = len(df)

    # Parse date using custom parser
    df["order_date"] = df["order_date"].apply(parse_date)

    # Drop unrecoverable rows
    df = df.dropna(subset=["customer_id", "order_id"], how="all")

    # Fix amount
    df["amount"] = pd.to_numeric(df["amount"], errors="coerce")
    df["amount"] = df.groupby("product")["amount"].transform(
        lambda x: x.fillna(x.median())
    )

    # Normalize status
    status_map = {
        "done": "completed",
        "complete": "completed",
        "canceled": "cancelled",
    }

    df["status"] = df["status"].astype(str).str.lower()
    df["status"] = df["status"].replace(status_map)

    allowed_status = {"completed", "pending", "cancelled", "refunded"}
    df.loc[~df["status"].isin(allowed_status), "status"] = "pending"

    # Derived column
    df["order_year_month"] = df["order_date"].dt.strftime("%Y-%m")

    df.to_csv(PROCESSED / "orders_clean.csv", index=False)

    print("---- Orders Cleaning Report ----")
    print(f"Rows before: {before_rows}")
    print(f"Rows after:  {len(df)}")
    print()


if __name__ == "__main__":
    PROCESSED.mkdir(exist_ok=True, parents=True)
    clean_customers()
    clean_orders()