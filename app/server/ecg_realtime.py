import time
import numpy as np
from collections import deque
from pyOpenBCI import OpenBCICyton
import threading

# Глобальные переменные
sampling_rate = 250  # Частота дискретизации OpenBCI
ecg_data = [deque(maxlen=sampling_rate * 10) for _ in range(8)]  # Хранилище для всех 8 каналов (10 секунд данных)

def process_data(sample):
    global ecg_data

    # Сохраняем данные со всех каналов
    for i in range(8):
        ecg_data[i].append(sample.channels_data[i])

def display_results():
    while True:
        time.sleep(1)  # Обновление каждую секунду

        # Вывод данных со всех каналов
        print("Сигналы со всех каналов:")
        for i in range(8):
            channel_data = list(ecg_data[i])  # Последние 10 секунд данных
            if len(channel_data) > 0:
                print(f"Канал {i + 1}: {channel_data[-1]:.2f} мкВ")  # Последнее значение
            else:
                print(f"Канал {i + 1}: нет данных")

# Запуск потока для отображения результатов
thread = threading.Thread(target=display_results)
thread.daemon = True
thread.start()

# Подключение к OpenBCI и начало считывания данных
try:
    board = OpenBCICyton(port='COM8')  # Укажите ваш порт
    print("Подключение к OpenBCI установлено. Начало считывания данных...")
    board.start_stream(process_data)
except Exception as e:
    print(f"Ошибка подключения или считывания данных с OpenBCI: {e}")