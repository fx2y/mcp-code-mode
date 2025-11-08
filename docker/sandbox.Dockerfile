# Minimal sandbox base image per @spec/tasks.md §1.2
FROM node:20-bookworm-slim

# Install tini for better signal handling and basic tooling useful for debugging
RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    ca-certificates \
    curl \
    git \
    tini \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /workspace

# Drop privileges; runner can override via --user flag when necessary
RUN useradd --uid 1000 --gid 1000 --home /workspace sandbox || true
USER 1000:1000

ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["/bin/sh"]
