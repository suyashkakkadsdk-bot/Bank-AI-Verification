# backend/models/train_loan_model.py
"""
Training script for synthetic XGBoost loan model.
Generates synthetic data from 3 real records, trains model, saves to JSON.

LIMITATIONS:
- Uses ONLY 3 real records as seed - NOT sufficient for real training
- Synthetic data generated via noise injection and manual oversampling - creates NO new real information
- Model is for HACKATHON PROTOTYPE ONLY - not production-validated
- Fixed random seed for reproducibility
- NO sklearn/imblearn dependency (DLL blocked in this environment)
"""
import json
import numpy as np
import xgboost as xgb

# ============================================================
# REAL SEED DATA (3 records from data/loan/loan_applications.json)
# ============================================================
REAL_RECORDS = [
    {
        "application_id": "LN001", "applicant_id": "APP001",
        "income": 60000, "credit_score": 760, "employment_status": "Salaried",
        "existing_debt": 0, "monthly_emi": 5000, "loan_amount": 300000,
        "loan_tenure": 36, "repayment_history": "Good",
        "label": 1  # APPROVED (credit >= 700)
    },
    {
        "application_id": "LN002", "applicant_id": "APP002",
        "income": 35000, "credit_score": 610, "employment_status": "Self-Employed",
        "existing_debt": 250000, "monthly_emi": 12000, "loan_amount": 800000,
        "loan_tenure": 60, "repayment_history": "Poor",
        "label": 0  # REJECTED (credit < 700)
    },
    {
        "application_id": "LN003", "applicant_id": "APP003",
        "income": 45000, "credit_score": 720, "employment_status": "Salaried",
        "existing_debt": 50000, "monthly_emi": 4000, "loan_amount": 250000,
        "loan_tenure": 36, "repayment_history": "Good",
        "label": 1  # APPROVED (credit >= 700)
    },
]

# Feature names in exact order for model
FEATURE_NAMES = [
    "credit_score",
    "income",
    "existing_debt",
    "monthly_emi",
    "loan_amount",
    "loan_tenure",
    "emp_salaried",
    "emp_self_employed",
    "repay_good",
    "repay_poor",
]


def prepare_features(application: dict) -> np.ndarray:
    """Convert application dict to feature array in exact order."""
    credit_score = float(application.get("credit_score", 0))
    income = float(application.get("income", 0))
    existing_debt = float(application.get("existing_debt", 0))
    monthly_emi = float(application.get("monthly_emi", 0))
    loan_amount = float(application.get("loan_amount", 0))
    loan_tenure = float(application.get("loan_tenure", 0))
    
    emp = application.get("employment_status", "").lower()
    emp_salaried = 1.0 if emp == "salaried" else 0.0
    emp_self_employed = 1.0 if emp == "self-employed" else 0.0
    
    repay = application.get("repayment_history", "").lower()
    repay_good = 1.0 if repay == "good" else 0.0
    repay_poor = 1.0 if repay == "poor" else 0.0
    
    return np.array([[
        credit_score, income, existing_debt, monthly_emi,
        loan_amount, loan_tenure,
        emp_salaried, emp_self_employed,
        repay_good, repay_poor
    ]], dtype=float)


def generate_synthetic_data(n_samples=10000, random_seed=42):
    """
    Generate synthetic training data from 3 real records.
    
    METHOD:
    1. Start with 3 real records (2 approved, 1 rejected)
    2. Add Gaussian noise to numeric features (5% of std)
    3. Manual oversampling to balance classes (replicate minority class)
    4. Final dataset: ~n_samples records
    
    WARNING: Synthetic data does NOT create new real-world information.
    The model learns patterns from 3 points + noise + replication.
    """
    np.random.seed(random_seed)
    
    # Extract features and labels from real records
    X_real = []
    y_real = []
    for rec in REAL_RECORDS:
        feat = prepare_features(rec).flatten()
        X_real.append(feat)
        y_real.append(rec["label"])
    
    X_real = np.array(X_real)
    y_real = np.array(y_real)
    
    print(f"Real records: {len(X_real)} (approved={sum(y_real)}, rejected={len(y_real)-sum(y_real)})")
    
    # Add noise to create initial synthetic pool
    noise_scale = 0.05  # 5% noise
    X_synthetic = []
    y_synthetic = []
    
    # Compute std for noise scaling
    feature_stds = X_real.std(axis=0)
    feature_stds[feature_stds == 0] = 1.0  # avoid division by zero
    
    for _ in range(n_samples):
        idx = np.random.randint(len(X_real))
        base = X_real[idx].copy()
        label = y_real[idx]
        
        # Add noise to numeric features (indices 0-5)
        for i in range(6):
            base[i] += np.random.normal(0, feature_stds[i] * noise_scale)
        
        # Ensure valid ranges
        base[0] = np.clip(base[0], 300, 850)  # credit_score
        base[1] = max(base[1], 10000)          # income
        base[2] = max(base[2], 0)              # existing_debt
        base[3] = max(base[3], 0)              # monthly_emi
        base[4] = max(base[4], 10000)          # loan_amount
        base[5] = np.clip(base[5], 12, 120)    # loan_tenure
        
        X_synthetic.append(base)
        y_synthetic.append(label)
    
    X_synthetic = np.array(X_synthetic)
    y_synthetic = np.array(y_synthetic)
    
    print(f"After noise augmentation: {len(X_synthetic)} samples")
    
    # Manual oversampling: replicate minority class (rejected=0)
    approved_mask = y_synthetic == 1
    rejected_mask = y_synthetic == 0
    n_approved = approved_mask.sum()
    n_rejected = rejected_mask.sum()
    
    if n_rejected < n_approved:
        # Oversample rejected class
        oversample_factor = int(n_approved / n_rejected)
        X_rejected = X_synthetic[rejected_mask]
        y_rejected = y_synthetic[rejected_mask]
        
        # Replicate with small noise
        X_extra = []
        y_extra = []
        for _ in range(oversample_factor - 1):
            for i in range(len(X_rejected)):
                extra = X_rejected[i].copy()
                extra += np.random.normal(0, feature_stds * 0.01)  # tiny noise
                extra[0] = np.clip(extra[0], 300, 850)
                extra[1] = max(extra[1], 10000)
                extra[2] = max(extra[2], 0)
                extra[3] = max(extra[3], 0)
                extra[4] = max(extra[4], 10000)
                extra[5] = np.clip(extra[5], 12, 120)
                X_extra.append(extra)
                y_extra.append(0)
        
        if X_extra:
            X_synthetic = np.vstack([X_synthetic, X_extra])
            y_synthetic = np.hstack([y_synthetic, y_extra])
    
    print(f"After manual oversampling: {len(X_synthetic)} samples (approved={(y_synthetic==1).sum()}, rejected={(y_synthetic==0).sum()})")
    
    return X_synthetic, y_synthetic


def train_test_split_manual(X, y, test_size=0.2, random_seed=42):
    """Manual train/test split without sklearn."""
    np.random.seed(random_seed)
    n = len(X)
    indices = np.random.permutation(n)
    split = int(n * (1 - test_size))
    train_idx, val_idx = indices[:split], indices[split:]
    return X[train_idx], X[val_idx], y[train_idx], y[val_idx]


def train_model(X, y):
    """Train XGBoost classifier."""
    X_train, X_val, y_train, y_val = train_test_split_manual(X, y)
    
    params = {
        "objective": "binary:logistic",
        "eval_metric": "logloss",
        "max_depth": 4,
        "learning_rate": 0.1,
        "n_estimators": 200,
        "subsample": 0.8,
        "colsample_bytree": 0.8,
        "random_state": 42,
        "n_jobs": 1,
    }
    
    dtrain = xgb.DMatrix(X_train, label=y_train, feature_names=FEATURE_NAMES)
    dval = xgb.DMatrix(X_val, label=y_val, feature_names=FEATURE_NAMES)
    
    model = xgb.train(
        params,
        dtrain,
        num_boost_round=200,
        evals=[(dval, "val")],
        early_stopping_rounds=20,
        verbose_eval=False,
    )
    
    # Evaluate
    train_pred = (model.predict(dtrain) >= 0.5).astype(int)
    val_pred = (model.predict(dval) >= 0.5).astype(int)
    train_acc = (train_pred == y_train).mean()
    val_acc = (val_pred == y_val).mean()
    
    print(f"Train accuracy: {train_acc:.4f}")
    print(f"Val accuracy: {val_acc:.4f}")
    
    return model


def save_model(model, path):
    """Save model to JSON format."""
    model.save_model(str(path))
    print(f"Model saved to {path}")


if __name__ == "__main__":
    print("=" * 60)
    print("SYNTHETIC LOAN MODEL TRAINING")
    print("=" * 60)
    print("WARNING: Training on 3 real records + synthetic data")
    print("         NOT suitable for production use")
    print("=" * 60)
    
    # Generate synthetic data
    X, y = generate_synthetic_data(n_samples=10000)
    
    # Train model
    model = train_model(X, y)
    
    # Save model
    save_model(model, "backend/models/loan_xgb_model.json")
    
    # Verify load
    model2 = xgb.Booster()
    model2.load_model("backend/models/loan_xgb_model.json")
    print("Model verified: loads successfully")
    
    # Quick prediction test
    test_app = {
        "credit_score": 760, "income": 60000, "existing_debt": 0,
        "monthly_emi": 5000, "loan_amount": 300000, "loan_tenure": 36,
        "employment_status": "Salaried", "repayment_history": "Good"
    }
    features = prepare_features(test_app)
    dtest = xgb.DMatrix(features, feature_names=FEATURE_NAMES)
    prob = model2.predict(dtest)[0]
    print(f"Test prediction: prob={prob:.4f}, decision={'APPROVED' if prob >= 0.5 else 'REJECTED'}")