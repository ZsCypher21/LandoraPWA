# PostgreSQL 16 with PostGIS and pgvector, matching production extensions.
# Starts from pgvector's official image (Debian bookworm) and adds PostGIS from the PostgreSQL apt repo.
# The previous base, postgis/postgis:16-3.4, is Debian bullseye (end of life); installing pgvector on it failed in CI.
FROM pgvector/pgvector:pg16-bookworm
RUN apt-get update \
  && apt-get install -y --no-install-recommends postgresql-16-postgis-3 postgresql-16-postgis-3-scripts \
  && rm -rf /var/lib/apt/lists/*
