import time
import numpy as np
import scipy.signal as signal
import neurokit2 as nk
import threading
from collections import deque
from pyOpenBCI import OpenBCICyton
import pandas as pd

# Глобальные переменные
len_experiment_sec = 15 * 60 + 20
sampling_rate = 250
ecg_data = [deque(maxlen=sampling_rate * len_experiment_sec) for _ in range(1)]
stress_threshold = 100
wait_time = 60
end_time = time.time() + len_experiment_sec

# Переменные для расчета
heart_rate_history = []
hrv_history = []
standard_hr = None
standard_hrv = None
skip_initial_seconds = 20
data_start_time = None
count_hrv_time = 0

def process_data(sample):
    global ecg_data, data_start_time

    if data_start_time is None:
        data_start_time = time.time()
    if time.time() - data_start_time < skip_initial_seconds:
        return

    ecg_data[0].append(sample.channels_data[4])

def filter_ecg_signal(signal_data, lowcut=1.0, highcut=45.0):
    nyquist = 0.5 * sampling_rate
    low = lowcut / nyquist
    high = highcut / nyquist
    b, a = signal.butter(3, [low, high], btype='band')
    return signal.filtfilt(b, a, signal_data)

def calculate_hrv(peaks):
    if len(peaks) > 1:
        rr_intervals = np.diff(peaks) / sampling_rate * 1000
        return np.std(rr_intervals)
    return 0

def assess_stress(heart_rate, hrv):
    global standard_hr, standard_hrv

    if standard_hr is not None and standard_hrv is not None:
        hr_increase = heart_rate > standard_hr * 1.1
        hrv_decrease = hrv < standard_hrv * 0.9

        if hr_increase and hrv_decrease:
            return "высокий уровень"
        else:
            return "в норме"
    else:
        return "недостаточно данных для оценки стресса"

def save_data_to_csv():
    global ecg_data, heart_rate_history, hrv_history
    rows = len(ecg_data[0]) // sampling_rate

    ecg_data_list = list(ecg_data[0].copy())
    df_ecg = pd.DataFrame(ecg_data_list, columns=['Column_0'])
    df_ecg.to_csv('ecg_data.csv', index=False)

    df_heart_rate = pd.DataFrame(heart_rate_history, columns=['Heart Rate'])
    df_heart_rate.to_csv('heart_rate_history.csv', index=False)

    df_hrv = pd.DataFrame(hrv_history, columns=['HRV (SDNN)'])
    df_hrv.to_csv('hrv_history.csv', index=False)

def display_results():
    global is_waiting, heart_rate_history, hrv_history, standard_hr, standard_hrv, count_hrv_time, ecg_data

    while time.time() < end_time:
        time.sleep(10)
        if count_hrv_time == 30:
            count_hrv_time = 0
        else:
            count_hrv_time = count_hrv_time+10
        if all(len(data) >= sampling_rate * wait_time for data in ecg_data):

            last_minute_data = list(ecg_data[0])[-sampling_rate * 60:]
            filtered_signal = filter_ecg_signal(np.array(last_minute_data))
            processed_ecg, info = nk.ecg_process(filtered_signal, sampling_rate=sampling_rate)
            
            heart_rate = np.mean(processed_ecg["ECG_Rate"])
            heart_rate_history.append(heart_rate)

            if (len(ecg_data[0]) >= sampling_rate * 300) and (count_hrv_time == 30):
                five_minute_data = list(ecg_data[0])[-sampling_rate * 300:]
                filtered_signal_5min = filter_ecg_signal(np.array(five_minute_data))
                processed_ecg_5min, info = nk.ecg_process(filtered_signal_5min, sampling_rate=sampling_rate)
                hrv = nk.hrv_time(processed_ecg_5min["ECG_R_Peaks"], sampling_rate=sampling_rate)["HRV_SDNN"].values[0]
                hrv_history.append(hrv)
            else:
                hrv = 0

            if len(heart_rate_history) >= 30 and len(hrv_history) == 1 and standard_hr is None:
                standard_hr = np.mean(heart_rate_history[-30:])
                standard_hrv = np.mean(hrv_history[-1:])

            stress_status = assess_stress(heart_rate, hrv)

            print(f"ЧСС: {heart_rate:.2f} уд./мин.")
            if (len(ecg_data[0]) >= sampling_rate * 300) and (count_hrv_time == 30):
                print(f"ВСР (SDNN): {hrv:.2f} мс")
            print(f"Статус стресса: {stress_status}")

            if standard_hr and standard_hrv:
                print(f"Стандартное ЧСС: {standard_hr:.2f}, Стандартное ВСР: {standard_hrv:.2f}")
            save_data_to_csv()

thread = threading.Thread(target=display_results)
thread.daemon = True
thread.start()

try:
    board = OpenBCICyton(port='COM8')
    board.start_stream(process_data)
except Exception as e:
    print(f"Ошибка подключения или считывания данных с OpenBCI: {e}")