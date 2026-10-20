# Site Pre-publish Checklist

Before running `make update` to push changes, verify the following items:

## 1. Post Front Matter and Paths

- [x] `title`, `date`, and `description` are filled in, and the filename uses only lowercase letters, digits, and hyphens
- [x] Local images and attachments live in the post's sidecar folder and use `./<slug>/file.ext` relative paths
- [x] `draft: true` has been removed from posts ready to publish

## 2. Local Validation Commands

| Command | What It Checks |
| :--- | :--- |
| `npx garden check content/posts/<slug>.md` | Checks a single post's component fields, code diffs, and local asset paths |
| `make check` | Runs `npx garden sync && npx garden build` to validate the full site build |
| `CONTENT_INCLUDE_DRAFTS=1 make dev` | Previews drafts and scheduled posts locally |
