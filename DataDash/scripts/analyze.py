import pandas as pd
from pathlib import Path
from pandas.errors import EmptyDataError

BASE_DIR = Path(__file__).resolve().parent.parent
RAW = BASE_DIR / "data" / "raw"
PROCESSED = BASE_DIR / "data" / "processed"


def load_csv(path):
    try:
        return pd.read_csv(path)
    except FileNotFoundError:
        raise FileNotFoundError(f"{path} not found")
    except EmptyDataError:
        raise ValueError(f"{path} is empty")


def main():
    customers = load_csv(PROCESSED / "customers_clean.csv")
    orders = load_csv(PROCESSED / "orders_clean.csv")
    products = load_csv(RAW / "products.csv")

    
    orders["order_date"] = pd.to_datetime(
        orders["order_date"], errors="coerce"
    )

    # Merge orders + customers
    orders_with_customers = pd.merge(
        orders,
        customers,
        on="customer_id",
        how="left",
    )

    # Merge products
    full_data = pd.merge(
        orders_with_customers,
        products,
        left_on="product",
        right_on="product_name",
        how="left",
    )

    print("Missing customers:", full_data["name"].isna().sum())
    print("Missing products:", full_data["category"].isna().sum())

    
    completed = full_data[full_data["status"] == "completed"].copy()


 
    monthly = (
        completed.groupby("order_year_month")["amount"]
        .sum()
        .reset_index()
        .rename(columns={"amount": "total_revenue"})
    )

    monthly.to_csv(PROCESSED / "monthly_revenue.csv", index=False)

    top = (
        completed.groupby(["customer_id", "name", "region"])["amount"]
        .sum()
        .reset_index()
        .rename(columns={"amount": "total_spend"})
        .sort_values("total_spend", ascending=False)
        .head(10)
    )

    
    if not completed.empty:
        latest_date = completed["order_date"].max()
        cutoff = latest_date - pd.Timedelta(days=90)

        recent_customers = completed[
            completed["order_date"] >= cutoff
        ]["customer_id"].unique()

        top["churned"] = ~top["customer_id"].isin(recent_customers)
    else:
        top["churned"] = True

    top.to_csv(PROCESSED / "top_customers.csv", index=False)

    category = (
        completed.groupby("category")
        .agg(
            total_revenue=("amount", "sum"),
            avg_order_value=("amount", "mean"),
            number_of_orders=("order_id", "count"),
        )
        .reset_index()
    )

    category.to_csv(PROCESSED / "category_performance.csv", index=False)

    
    regional = (
        completed.groupby("region")
        .agg(
            number_of_orders=("order_id", "count"),
            total_revenue=("amount", "sum"),
        )
        .reset_index()
    )

    regional["average_revenue_per_customer"] = (
        regional["total_revenue"] / regional["number_of_orders"]
    )

    regional.to_csv(PROCESSED / "regional_analysis.csv", index=False)

    print("Analysis complete ✔")


if __name__ == "__main__":
    main()
