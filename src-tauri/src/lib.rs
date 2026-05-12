use serde::Serialize;

const E6: &[f64] = &[1.0, 1.5, 2.2, 3.3, 4.7, 6.8];

const E12: &[f64] = &[1.0, 1.2, 1.5, 1.8, 2.2, 2.7, 3.3, 3.9, 4.7, 5.6, 6.8, 8.2];

const E24: &[f64] = &[
    1.0, 1.1, 1.2, 1.3, 1.5, 1.6, 1.8, 2.0, 2.2, 2.4, 2.7, 3.0, 3.3, 3.6, 3.9, 4.3, 4.7, 5.1, 5.6,
    6.2, 6.8, 7.5, 8.2, 9.1,
];

const E96: &[f64] = &[
    1.00, 1.02, 1.05, 1.07, 1.10, 1.13, 1.15, 1.18, 1.21, 1.24, 1.27, 1.30, 1.33, 1.37, 1.40, 1.43,
    1.47, 1.50, 1.54, 1.58, 1.62, 1.65, 1.69, 1.74, 1.78, 1.82, 1.87, 1.91, 1.96, 2.00, 2.05, 2.10,
    2.15, 2.21, 2.26, 2.32, 2.37, 2.43, 2.49, 2.55, 2.61, 2.67, 2.74, 2.80, 2.87, 2.94, 3.01, 3.09,
    3.16, 3.24, 3.32, 3.40, 3.48, 3.57, 3.65, 3.74, 3.83, 3.92, 4.02, 4.12, 4.22, 4.32, 4.42, 4.53,
    4.64, 4.75, 4.87, 4.99, 5.11, 5.23, 5.36, 5.49, 5.62, 5.76, 5.90, 6.04, 6.19, 6.34, 6.49, 6.65,
    6.81, 6.98, 7.15, 7.32, 7.50, 7.68, 7.87, 8.06, 8.25, 8.45, 8.66, 8.87, 9.09, 9.31, 9.53, 9.76,
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

fn normalize_mantissa(v: f64) -> f64 {
    let mut m = v;
    while m >= 10.0 {
        m /= 10.0;
    }
    while m < 1.0 {
        m *= 10.0;
    }
    (m * 100.0).round() / 100.0
}

fn determine_series(value: f64) -> &'static str {
    let m = normalize_mantissa(value);
    if E6
        .iter()
        .any(|&e| (normalize_mantissa(e) - m).abs() < 0.005)
    {
        return "E6";
    }
    if E12
        .iter()
        .any(|&e| (normalize_mantissa(e) - m).abs() < 0.005)
    {
        return "E12";
    }
    if E24
        .iter()
        .any(|&e| (normalize_mantissa(e) - m).abs() < 0.005)
    {
        return "E24";
    }
    "E96"
}

#[derive(Debug, Clone, Serialize)]
struct ResistorInfo {
    value: f64,
    components: Vec<f64>,
    component_series: Vec<String>,
    config: String,
}

#[derive(Debug, Serialize)]
struct DividerSolution {
    r1: ResistorInfo,
    r2: ResistorInfo,
    vo: f64,
    vi: f64,
    error_percent: f64,
}

fn is_e6_or_e12_mantissa(v: f64) -> bool {
    let m = normalize_mantissa(v);
    E12.iter().any(|&e| (normalize_mantissa(e) - m).abs() < 0.005)
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

fn build_search_set(
    all_values: &[f64],
    combo_values: &[f64],
    use_series: bool,
    use_parallel: bool,
) -> Vec<ResistorInfo> {
    let mut entries: Vec<(u64, ResistorInfo)> = Vec::new();

    for &v in all_values {
        let key = (v * 1e6).round() as u64;
        entries.push((
            key,
            ResistorInfo {
                value: v,
                components: vec![v],
                component_series: vec![determine_series(v).to_string()],
                config: "single".into(),
            },
        ));
    }

    if use_series {
        for &a in combo_values {
            for &b in combo_values {
                let v = a + b;
                let key = (v * 1e6).round() as u64;
                entries.push((
                    key,
                    ResistorInfo {
                        value: v,
                        components: vec![a, b],
                        component_series: vec![
                            determine_series(a).to_string(),
                            determine_series(b).to_string(),
                        ],
                        config: "series".into(),
                    },
                ));
            }
        }
    }

    if use_parallel {
        for &a in combo_values {
            for &b in combo_values {
                let v = a * b / (a + b);
                let key = (v * 1e6).round() as u64;
                entries.push((
                    key,
                    ResistorInfo {
                        value: v,
                        components: vec![a, b],
                        component_series: vec![
                            determine_series(a).to_string(),
                            determine_series(b).to_string(),
                        ],
                        config: "parallel".into(),
                    },
                ));
            }
        }
    }

    entries.sort_by(|a, b| a.0.cmp(&b.0));
    entries.dedup_by(|a, b| a.0 == b.0);

    entries.into_iter().map(|(_, info)| info).collect()
}

fn series_rank(s: &str) -> u32 {
    match s {
        "E6" => 0,
        "E12" => 1,
        "E24" => 2,
        "E96" => 3,
        _ => 4,
    }
}

fn config_rank(config: &str) -> u32 {
    match config {
        "single" => 0,
        "series" => 1,
        _ => 2,
    }
}

fn best_series_rank(component_series: &[String]) -> u32 {
    component_series
        .iter()
        .map(|s| series_rank(s))
        .min()
        .unwrap_or(4)
}

fn find_best_r1<'a>(
    search_set: &'a [ResistorInfo],
    ideal_r1: f64,
    r2_val: f64,
    known: f64,
    target: f64,
) -> Option<(&'a ResistorInfo, f64, f64)> {
    let idx = match search_set.binary_search_by(|probe| {
        probe
            .value
            .partial_cmp(&ideal_r1)
            .unwrap_or(std::cmp::Ordering::Less)
    }) {
        Ok(i) => i,
        Err(i) => i,
    };

    let mut best: Option<(&ResistorInfo, f64, f64)> = None;

    for &ci in &[idx.saturating_sub(1), idx, idx + 1] {
        if ci >= search_set.len() {
            continue;
        }
        let r1 = &search_set[ci];
        let computed = known * r2_val / (r1.value + r2_val);
        let error = ((computed - target) / target * 100.0).abs();
        if error < 5.0 && best.as_ref().map_or(true, |b| error < b.2) {
            best = Some((r1, computed, error));
        }
    }

    best
}

#[tauri::command]
async fn calculate_divider(
    vi: f64,
    vo: f64,
    series: String,
    use_series: bool,
    use_parallel: bool,
    count: u32,
    series_weight: f64,
    config_weight: f64,
    error_weight: f64,
    min_total_resistance: f64,
) -> Vec<DividerSolution> {
    tokio::task::spawn_blocking(move || {
        let base = get_series(&series);
        let all_values = expand_values(base, 0, 6);

        let combo_values: Vec<f64> = if use_series || use_parallel {
            if series == "E24" || series == "E96" {
                all_values
                    .iter()
                    .filter(|&&v| is_e6_or_e12_mantissa(v))
                    .copied()
                    .collect()
            } else {
                all_values.clone()
            }
        } else {
            all_values.clone()
        };

        let search_set = build_search_set(&all_values, &combo_values, use_series, use_parallel);

        if !(vo > 0.0 && vo < vi) {
            return vec![];
        }

        let target_ratio = vo / vi;
        let mut solutions: Vec<DividerSolution> = Vec::new();

        for r2 in &search_set {
            let ideal_r1 = r2.value * (1.0 / target_ratio - 1.0);

            if let Some((r1, computed, error)) =
                find_best_r1(&search_set, ideal_r1, r2.value, vi, vo)
            {
                let total = r1.value + r2.value;
                if total < min_total_resistance {
                    continue;
                }
                solutions.push(DividerSolution {
                    r1: r1.clone(),
                    r2: r2.clone(),
                    vo: computed,
                    vi: vo * total / r2.value,
                    error_percent: error,
                });
            }
        }

        solutions.sort_by(|a, b| {
            let a_series = (best_series_rank(&a.r1.component_series)
                + best_series_rank(&a.r2.component_series)) as f64;
            let b_series = (best_series_rank(&b.r1.component_series)
                + best_series_rank(&b.r2.component_series)) as f64;
            let a_config = (config_rank(&a.r1.config) + config_rank(&a.r2.config)) as f64;
            let b_config = (config_rank(&b.r1.config) + config_rank(&b.r2.config)) as f64;
            let sa = a_series * series_weight + a_config * config_weight + a.error_percent * error_weight;
            let sb = b_series * series_weight + b_config * config_weight + b.error_percent * error_weight;
            sa.partial_cmp(&sb).unwrap()
        });
        solutions.truncate(count as usize);
        solutions
    })
    .await
    .unwrap()
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
