-- Wide banner image for a collection, separate from the square image_url
-- logo. Resolved off-chain the same way name/image_url/description are
-- (see metadata_resolver.rs), from the metadata JSON's `banner_image` field.
ALTER TABLE nft_collections ADD COLUMN IF NOT EXISTS banner_url TEXT;
