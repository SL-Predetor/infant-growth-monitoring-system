"""Postpartum package imports.

This package contains the pain prediction API and associated utilities that
were originally part of the separate `postpartum_ai` project.  The file
structure mirrors the upstream project but the FastAPI application has been
converted into a router so it can be mounted under the primary backend.
"""

from .api import router

__all__ = ["router"]
