import numpy as np

def generate_ecg_signal(pattern='calm', target_bpm=60, duration_seconds=1, sampling_rate=250):
    """
    Генерирует синтетический ЭКГ сигнал с заданными параметрами
    
    Args:
        pattern: тип паттерна ('calm', 'medium', 'extreme')
        target_bpm: целевой пульс
        duration_seconds: длительность сигнала в секундах
        sampling_rate: частота дискретизации в Гц
    """
    t = np.linspace(0, duration_seconds, int(duration_seconds * sampling_rate))
    
    # Базовая линия
    signal = np.zeros_like(t)
    
    # Настройки амплитуды в зависимости от паттерна
    amplitudes = {
        'calm': {'p': 0.25, 'qrs': 1.5, 't': 0.35, 'noise': 0.05},
        'medium': {'p': 0.3, 'qrs': 2.0, 't': 0.45, 'noise': 0.08},
        'extreme': {'p': 0.35, 'qrs': 2.5, 't': 0.55, 'noise': 0.12}
    }
    
    amp = amplitudes.get(pattern, amplitudes['calm'])
    
    # Корректируем частоту появления пиков в зависимости от BPM
    period = 60.0 / target_bpm
    
    # P-волна
    signal += amp['p'] * np.exp(-(t % period - 0.2 * period)**2 / 0.001)
    
    # QRS-комплекс
    signal += amp['qrs'] * np.exp(-(t % period - 0.4 * period)**2 / 0.0002)
    signal -= amp['qrs']/3 * np.exp(-(t % period - 0.35 * period)**2 / 0.0002)
    signal -= amp['qrs']/3 * np.exp(-(t % period - 0.45 * period)**2 / 0.0002)
    
    # T-волна
    signal += amp['t'] * np.exp(-(t % period - 0.6 * period)**2 / 0.002)
    
    # Добавляем шум
    noise = np.random.normal(0, amp['noise'], len(t))
    signal += noise
    
    return signal.tolist() 