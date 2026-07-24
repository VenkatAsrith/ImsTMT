const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabaseBucket = process.env.SUPABASE_BUCKET || 'documents';

let supabase = null;
if (supabaseUrl && supabaseKey) {
  try {
    supabase = createClient(supabaseUrl, supabaseKey);
    console.log('✅ Supabase Storage client initialized.');
  } catch (err) {
    console.error('❌ Failed to initialize Supabase client:', err.message);
  }
} else {
  console.warn('⚠️ SUPABASE_URL or SUPABASE_KEY is missing. Falling back to local storage.');
}

/**
 * Uploads a file to Supabase Storage, deleting the local file after success.
 * If Supabase is unconfigured, it acts as a pass-through returning a relative local path.
 * 
 * @param {string} localFilePath Path to the local file
 * @param {string} folder Folder prefix in Supabase (e.g. 'receipts', 'submissions')
 * @param {string} fileName Final filename to save as
 * @param {string} mimeType Mime-type header
 * @returns {Promise<string>} Public URL of the uploaded file
 */
const uploadFileToCloud = async (localFilePath, folder, fileName, mimeType, deleteLocal = false) => {
  // If file doesn't exist locally, throw error
  if (!fs.existsSync(localFilePath)) {
    throw new Error(`Local file not found at path: ${localFilePath}`);
  }

  // Define relative path fallback
  const relativePath = localFilePath.replace(/\\/g, '/').split('/backend')[1] || localFilePath;

  if (!supabase) {
    console.log(`⚠️ Supabase not configured. Retaining local file at: ${relativePath}`);
    return relativePath;
  }

  try {
    const fileBuffer = fs.readFileSync(localFilePath);
    const cloudPath = `${folder}/${fileName}`;

    // Upload to Supabase Bucket
    const { data, error } = await supabase.storage
      .from(supabaseBucket)
      .upload(cloudPath, fileBuffer, {
        contentType: mimeType,
        upsert: true,
      });

    if (error) {
      throw new Error(`Supabase upload failed: ${error.message}`);
    }

    // Get Public URL
    const { data: publicUrlData } = supabase.storage
      .from(supabaseBucket)
      .getPublicUrl(cloudPath);

    if (!publicUrlData || !publicUrlData.publicUrl) {
      throw new Error('Could not retrieve public URL from Supabase Storage');
    }

    // Delete local copy if requested
    if (deleteLocal) {
      try {
        fs.unlinkSync(localFilePath);
        console.log(`🗑️ Deleted local temporary file: ${localFilePath}`);
      } catch (unlinkErr) {
        console.warn(`⚠️ Failed to delete local temp file at ${localFilePath}:`, unlinkErr.message);
      }
    }

    return publicUrlData.publicUrl;
  } catch (err) {
    console.error(`❌ Cloud upload error for ${fileName}:`, err.message);
    return relativePath;
  }
};

module.exports = {
  uploadFileToCloud,
  isCloudConfigured: () => !!supabase,
};
