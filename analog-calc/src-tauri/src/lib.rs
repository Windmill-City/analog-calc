use serde::Serialize;

const E6: &[f64] = &[1.0, 1.5, 2.2, 3.3, 4.7, 6.8];

const E12: &[f64] = &[1.0, 1.2, 1.5, 1.8, 2.2, 2.7, 3.3, 3.9, 4.7, 5.6, 6.8, 8.2];

const E24: &[f64] = &[
    1.0, 1.1, 1.2, 1.3, 1.5, 1.6, 1.8, 2.0, 2.2, 2.4, 2.7, 3.0, 3.3, 3.6, 3.9, 4.3, 4.7, 5.1,
    5.6, 6.2, 6.8, 7.5, 8.2, 9.1,
];

const E96: &[f64] = &[
    1.00, 1.02, 1.05, 1.07, 1.10, 1.13, 1.15, 1.18, 1.21, 1.24, 1.27, 1.30, 1.33, 1.37, 1.40,
    1.43, 1.47, 1.50, 1.54, 1.58, 1.62, 1.65, 1.69, 1.74, 1.78, 1.82, 1.87, 1.91, 1.96, 2.00,
    2.05, 2.10, 2.15, 2.21, 2.26, 2.32, 2.37, 2.43, 2.49, 2.55, 2.61, 2.67, 2.74, 2.80, 2.87,
    2.94, 3.01, 3.09, 3.16, 3.24, 3.32, 3.40, 3.48, 3.57, 3.65, 3.74, 3.83, 3.92, 4.02, 4.12,
    4.22, 4.32, 4.42, 4.53, 4.64, 4.75, 4.87, 4.99, 5.11, 5.23, 5.36, 5.49, 5.62, 5.76, 5.90,
    6.04, 6.19, 6.34, 6.49, 6.65, 6.81, 6.98, 7.15, 7.32, 7.50, 7.68, 7.87, 8.06, 8.25, 8.45,
    8.66, 8.87, 9.09, 9.31, 9.53, 9.76,
];

#[tauri::command]
fn calculate_cutoff(resistance: f64, capacitance: f64) -> f64 {
    1.0 / (2.0 * std::f64::consts::PI * resistance * capacitance)
}

#[tauri::command]
fn calculate_noise(
    gbw: f64,
    gain: f64,
    vn_density: f64,
    filter_order: u32,
    rc_bandwidth: f64,
) -> f64 {
    let closed_loop_bw = gbw / gain;
    let enb_factor = match filter_order {
        1 => std::f64::consts::PI / 2.0,
        2 => std::f64::consts::PI / 4.0,
        3 => std::f64::consts::PI / 8.0,
        _ => std::f64::consts::PI / 2.0,
    };
    let noise_bw = rc_bandwidth * enb_factor;
    let effective_bw = closed_loop_bw.min(noise_bw);
    vn_density * 1e-9 * effective_bw.sqrt()
}

#[derive(Debug, Serialize)]
struct DividerSolution {
    r1: f64,
    r2: f64,
    vo: f64,
    error_percent: f64,
}

fn get_series(series: &str) -> &[f64] {
    match series {
        "E6" => E6,
        "E12" => E12,
        "E24" => E24,
        "E96" => E96,
        _ => E24,
    }
}

fn expand_values(base: &[f64], min_decades: i32, max_decades: i32) -> Vec<f64> {
    let mut values = Vec::new();
    for d in min_decades..=max_decades {
        let m = 10.0_f64.powi(d);
        for v in base {
            values.push(v * m);
        }
    }
    values
}

fn combine_series(values: &[f64]) -> Vec<f64> {
    let mut combined: Vec<f64> = values.to_vec();
    for &a in values {
        for &b in values {
            combined.push(a + b);
            combined.push(a * b / (a + b));
        }
    }
    combined.sort_by(|a, b| a.partial_cmp(b).unwrap());
    combined.dedup();
    combined
}

#[tauri::command]
fn calculate_divider(
    vi: f64,
    target_vo: f64,
    series: String,
    use_combinations: bool,
    count: u32,
) -> Vec<DividerSolution> {
    let base = get_series(&series);
    let values = expand_values(base, 0, 6);
    let search_set = if use_combinations {
        combine_series(&values)
    } else {
        values
    };

    let mut solutions: Vec<DividerSolution> = Vec::new();
    for &r1 in &search_set {
        for &r2 in &search_set {
            let vo = vi * r2 / (r1 + r2);
            let error_percent = if target_vo != 0.0 {
                ((vo - target_vo) / target_vo * 100.0).abs()
            } else {
                vo.abs() * 100.0
            };
            if error_percent < 5.0 {
                solutions.push(DividerSolution {
                    r1,
                    r2,
                    vo,
                    error_percent,
                });
            }
        }
    }

    solutions.sort_by(|a, b| a.error_percent.partial_cmp(&b.error_percent).unwrap());
    solutions.truncate(count as usize);
    solutions
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            calculate_cutoff,
            calculate_noise,
            calculate_divider
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
