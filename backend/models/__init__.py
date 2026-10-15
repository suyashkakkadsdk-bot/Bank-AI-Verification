# backend/models/__init__.py
"""
Model loading utilities for Bank AI Verification System.
"""
from pathlib import Path

MODELS_DIR = Path(__file__).parent

__all__ = ["MODELS_DIR"]