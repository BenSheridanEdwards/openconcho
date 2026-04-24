// Prevents the Windows console window from appearing in release builds
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    openconcho_lib::run();
}
