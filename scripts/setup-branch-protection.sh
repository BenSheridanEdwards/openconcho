#!/usr/bin/env bash
# Enable branch protection on `main`.
#
# Requires: gh CLI authenticated against a token with `repo` scope on the
# target repository (BenSheridanEdwards/openconcho by default).
#
# Idempotent — re-running just re-applies the same policy.
#
# Usage:
#   ./scripts/setup-branch-protection.sh                                # default repo
#   ./scripts/setup-branch-protection.sh <owner>/<repo>                 # override
#
# What it does:
#   - Require status check `check` to pass (the CI job in .github/workflows/ci.yml)
#   - Require branches to be up to date with main before merging (strict mode)
#   - Require PRs to merge — no direct push to main
#   - Require linear history (no merge commits)
#   - Require conversation resolution before merge
#   - Block force pushes
#   - Block branch deletion
#   - Do NOT require approving reviews (solo project; PR is the control, not approval count)

set -euo pipefail

REPO="${1:-BenSheridanEdwards/openconcho}"
BRANCH="main"

# Required status check job name. Matches the `name:` of the job in
# .github/workflows/ci.yml — change here if the job name changes.
CHECK_CONTEXT="check"

echo "Applying branch protection to ${REPO}@${BRANCH}…"

gh api -X PUT "repos/${REPO}/branches/${BRANCH}/protection" \
  --input - <<EOF
{
  "required_status_checks": {
    "strict": true,
    "contexts": ["${CHECK_CONTEXT}"]
  },
  "enforce_admins": false,
  "required_pull_request_reviews": {
    "dismiss_stale_reviews": true,
    "require_code_owner_reviews": false,
    "required_approving_review_count": 0
  },
  "restrictions": null,
  "allow_force_pushes": false,
  "allow_deletions": false,
  "required_conversation_resolution": true,
  "required_linear_history": true
}
EOF

echo ""
echo "✓ Branch protection applied to ${REPO}@${BRANCH}"
echo ""
echo "Verify in the UI:"
echo "  https://github.com/${REPO}/settings/branches"
echo ""
echo "Or inspect via API:"
echo "  gh api repos/${REPO}/branches/${BRANCH}/protection | jq"
