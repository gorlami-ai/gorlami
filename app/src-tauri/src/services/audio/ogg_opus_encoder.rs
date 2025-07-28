use crate::error::{AppError, AppResult};

pub fn encode_to_ogg_opus(samples: &[f32]) -> AppResult<Vec<u8>> {
    // Convert f32 to i16 (ogg-opus expects i16)
    let samples_i16: Vec<i16> = samples
        .iter()
        .map(|&s| (s.clamp(-1.0, 1.0) * 32767.0) as i16)
        .collect();
    
    // Encode with 16kHz sample rate, mono
    let opus_data = ogg_opus::encode::<16000, 1>(&samples_i16)
        .map_err(|e| AppError::Audio(format!("Failed to encode Opus: {:?}", e)))?;
    
    Ok(opus_data)
}