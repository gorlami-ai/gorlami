use crate::error::{AppError, AppResult};

pub fn encode_to_ogg_opus(samples: &[f32]) -> AppResult<Vec<u8>> {
    // Convert f32 samples to i16 for ogg-opus encoder
    let i16_samples: Vec<i16> = samples
        .iter()
        .map(|&s| {
            let clamped = s.clamp(-1.0, 1.0);
            (clamped * 32767.0) as i16
        })
        .collect();
    
    // Encode to Ogg Opus at 16kHz mono
    let ogg_opus_data = ogg_opus::encode::<16000, 1>(&i16_samples)
        .map_err(|e| AppError::Audio(format!("Failed to encode Opus: {:?}", e)))?;
    
    Ok(ogg_opus_data)
}