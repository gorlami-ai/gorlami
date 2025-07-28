
use rubato::{Resampler, SincFixedIn, SincInterpolationType, SincInterpolationParameters, WindowFunction};
use crate::error::{AppError, AppResult};

/// Convert multi-channel audio to mono by averaging channels
pub fn convert_to_mono(samples: &[f32], channels: usize) -> Vec<f32> {
    samples
        .chunks(channels)
        .map(|chunk| chunk.iter().sum::<f32>() / channels as f32)
        .collect()
}

/// Calculate RMS (Root Mean Square) for audio level monitoring
pub fn calculate_rms(samples: &[f32]) -> f32 {
    if samples.is_empty() {
        return 0.0;
    }
    let sum_of_squares: f32 = samples.iter().map(|&s| s * s).sum();
    (sum_of_squares / samples.len() as f32).sqrt()
}

/// Resample audio from source sample rate to 16kHz for optimal speech recognition
pub fn resample_to_16khz(samples: &[f32], source_sample_rate: u32) -> AppResult<Vec<f32>> {
    const TARGET_SAMPLE_RATE: u32 = 16000;
    
    // If already at 16kHz, return as-is
    if source_sample_rate == TARGET_SAMPLE_RATE {
        return Ok(samples.to_vec());
    }
    
    // Create resampler with high quality settings for speech
    let params = SincInterpolationParameters {
        sinc_len: 256,
        f_cutoff: 0.95,
        interpolation: SincInterpolationType::Linear,
        oversampling_factor: 256,
        window: WindowFunction::BlackmanHarris2,
    };
    
    let mut resampler = SincFixedIn::<f32>::new(
        TARGET_SAMPLE_RATE as f64 / source_sample_rate as f64,
        2.0,
        params,
        samples.len(),
        1, // mono channel
    ).map_err(|e| AppError::Audio(format!("Failed to create resampler: {}", e)))?;
    
    // Process the audio
    let mut output = vec![vec![0.0f32; resampler.output_frames_max()]];
    let (_, out_len) = resampler
        .process_into_buffer(&[samples], &mut output, None)
        .map_err(|e| AppError::Audio(format!("Resampling failed: {}", e)))?;
    
    // Return the resampled mono audio
    Ok(output[0][..out_len].to_vec())
}