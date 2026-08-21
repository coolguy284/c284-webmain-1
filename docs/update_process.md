# Package / Software Update Process

1. Run `node package-update.mjs`. For all altered `package.json` files, delete the `package-lock.json` in the same folder, then run `npm i --package-lock-only` (unless it is the root folder `package.json`, in which case run `npm i`).
2. Update the software versions in `docker/get_build_args.sh`.
3. Increase the fourth component of the package version in `srv_web_main/package.json`, setting it to `1` if it doesn't exist.
