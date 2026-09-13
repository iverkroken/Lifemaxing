# Local password blocklist

`common-passwords.txt` is the public SecLists `Passwords/Common-Credentials/10k-most-common.txt`, vendored unchanged from commit `913b327317496d062bcc7cace524aaad8a693be2`:

https://github.com/danielmiessler/SecLists/blob/913b327317496d062bcc7cace524aaad8a693be2/Passwords/Common-Credentials/10k-most-common.txt

SHA-256: `68782D6A4A19A4768D5F15DD66BD534E7A33055CC755411E33F16D18C50FDCCE`.

The MIT license is retained in `common-passwords.LICENSE`. These are public dictionary entries, never application credentials or user fixtures. The embedded resource is checked locally, case-insensitively, at password selection. No password or hash is sent to an external service. Password hashing itself uses the exact submitted text, without trimming, normalization or case conversion.

This is a limited common-password baseline, **not** comprehensive protection against breached passwords. Most entries are already excluded by the minimum length. Updating this resource is an explicit reviewed maintenance task: pin the upstream revision, verify licensing/checksum and rerun password-policy tests. Production recovery and broader offline blocklist maintenance are documented in README.md.
