# Learning Deposits

This folder is a lightweight, repo-local staging area for one-off learning capture. It does **not** replace any existing memory system.

The structure follows a simple `CODE + PARA` interpretation:

- `Capture`: grab the signal while it is fresh.
- `Organize`: decide whether it belongs to a Project, Area, Resource, or Archive.
- `Distill`: extract durable lessons and reusable heuristics.
- `Express`: turn the signal into a post, experiment, task, or conversation.

Recommended folders:

- `learning/inbox/`: fresh one-off deposits generated from digests or manual review.
- `learning/templates/`: note scaffolds that keep capture consistent.

Suggested workflow:

1. Generate a deposit candidate from the latest digest with `node scripts/create-learning-deposit.mjs`.
2. Review the note manually and decide the real PARA destination outside this repo.
3. Keep only lightweight candidates or templates here; raw private memory stays elsewhere.
