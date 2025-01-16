from flask import Flask, jsonify, request
from flask_cors import CORS
from ecg_simulator import generate_ecg_signal
import random
import datetime
import socket
from database import Database
import os
import numpy as np
from pyOpenBCI import OpenBCICyton
import scipy.signal
from flask import jsonify

app = Flask(__name__)
CORS(app, resources={
    r"/api/*": {
        "origins": ["http://localhost:3000", "http://localhost:3001"],
        "methods": ["GET", "POST", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type"],
        "expose_headers": ["Content-Type"],
        "supports_credentials": True
    }
})

# Пересоздаём базу при запуске
db = Database()
print("База данных успешно инициализирована")

# Глобальные настройки для ЭКГ сигнала
signal_settings = {
    'is_enabled': True,
    'pattern': 'calm',
    'bpm': 60,
    'precise_mode': False
}

# Глобальное хранилище для испытуемых
subjects_db = {}

# Добавляем хранилище для сессий
sessions_db = {}

# Добавим константу с допустимыми типами блоков
VALID_BLOCK_TYPES = {
    'calm': 'Спокойный этап',
    'tetris': 'Тест Струпа',
    'stroop_fast': 'Быстрый тест Струпа',  # Добавляем новый тип
    'dino': 'Игра Динозаврик',
    'custom': 'Пользовательский блок'
}

def get_random_bpm(base_bpm, pattern, precise_mode):
    if precise_mode:
        # В режиме точной настройки колебания ±10 от заданного значения
        variation = 10
        return base_bpm + random.randint(-variation, variation)
    else:
        # В обычном режиме колебания в пределах диапазона паттерна
        pattern_ranges = {
            'calm': (60, 80),
            'medium': (81, 120),
            'extreme': (121, 180)
        }
        min_bpm, max_bpm = pattern_ranges.get(pattern, (60, 80))
        return random.randint(min_bpm, max_bpm)
    
def get_ecg_realtime_data(com, channel):
    """
    Считывает данные с ЭКГ-устройства (OpenBCI) и возвращает их.
    
    :param com: Порт подключения устройства (например, 'COM8').
    :param channel: Номер канала для считывания данных (например, 5 для канала 5).
    :return: Массив данных с выбранного канала.
    """
    try:
        # Инициализация OpenBCI
        board = OpenBCICyton(port=com)

        # Создаем буфер для хранения данных
        data_buffer = []

        # Функция обработки данных
        def process_sample(sample):
            # Сохраняем данные с выбранного канала
            data_buffer.append(sample.channels_data[channel - 1])  # Каналы нумеруются с 0

        # Начинаем поток данных
        board.start_stream(process_sample)

        # Ждем, пока накопится достаточно данных (например, 250 точек = 1 секунда)
        while len(data_buffer) < 250:
            time.sleep(0.01)  # Небольшая задержка, чтобы не нагружать процессор

        # Останавливаем поток данных
        board.stop_stream()

        # Возвращаем данные
        return np.array(data_buffer)

    except Exception as e:
        print(f"Ошибка при считывании данных с ЭКГ-устройства: {e}")
        return np.array([])  # Возвращаем пустой массив в случае ошибки

@app.route('/api/ecg', methods=['GET'])
def get_ecg_data():
    try:
        if not signal_settings['is_enabled']:
            return jsonify({'data': [], 'bpm': 0})
        
        # Считываем данные с устройства OpenBCI
        ecg_data = get_ecg_realtime_data(com='COM8', channel=5)  # Укажите ваш порт и канал
        
        # Если данные отсутствуют, возвращаем пустой массив
        if len(ecg_data) == 0:
            return jsonify({'data': [], 'bpm': 0})
        
        # Рассчитываем ЧСС (примерная логика)
        peaks, _ = scipy.signal.find_peaks(ecg_data, distance=250)  # Поиск пиков
        current_bpm = len(peaks) * 6  # Примерный расчет ЧСС (6 * количество пиков в секунду)
        
        return jsonify({
            'data': ecg_data.tolist(),  # Преобразуем в список для JSON
            'bpm': current_bpm
        })
    except Exception as e:
        print(f"Error in get_ecg_data: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/settings', methods=['GET', 'POST'])
def handle_settings():
    if request.method == 'POST':
        new_settings = request.json
        # Обновляем настройки
        if 'is_enabled' in new_settings:
            signal_settings['is_enabled'] = new_settings['is_enabled']
        if 'pattern' in new_settings:
            signal_settings['pattern'] = new_settings['pattern']
        if 'bpm' in new_settings:
            signal_settings['bpm'] = new_settings['bpm']
        if 'precise_mode' in new_settings:
            signal_settings['precise_mode'] = new_settings['precise_mode']
        return jsonify({'status': 'success', 'settings': signal_settings})
    
    return jsonify(signal_settings)

@app.route('/api/subjects', methods=['GET'])
def get_subjects():
    subjects = db.get_all_subjects()
    return jsonify([{
        'id': subject['id'],
        'fullName': subject['fullName'],
        'ipAddress': subject['ipAddress'],
        'avatar': subject['avatar'],
        'lastActivity': subject['lastActivity'],
        'status': subject['status'],
        'statusDescription': subject['statusDescription'],
        'statusTimestamp': subject['statusTimestamp'],
        'statusChangesCount': subject['statusChangesCount']
    } for subject in subjects])

@app.route('/api/subjects/register', methods=['POST'])
def register_subject():
    data = request.json
    ip_address = request.remote_addr
    
    subject_id = db.register_subject(
        full_name=data['fullName'],
        ip_address=ip_address,
        avatar=data.get('avatar', 'cat')
    )
    
    if subject_id:
        return jsonify({
            'status': 'success',
            'subject_id': subject_id
        })
    
    return jsonify({'error': 'Registration failed'}), 500

@app.route('/api/subjects/update-status', methods=['POST'])
def update_subject_status():
    try:
        data = request.json
        ip_address = request.remote_addr
        status_code = data.get('status')
        
        if not status_code:
            return jsonify({'error': 'Status code is required'}), 400
            
        if db.update_subject_status(ip_address, status_code):
            return jsonify({'status': 'success'})
        else:
            return jsonify({'error': 'Failed to update status'}), 400
            
    except Exception as e:
        print(f"Error in update_subject_status endpoint: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/subjects/<subject_id>/history', methods=['GET'])
def get_subject_history(subject_id):
    try:
        history = db.get_subject_status_history(subject_id)
        return jsonify(history)
    except Exception as e:
        print(f"Error getting history: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/session/status', methods=['GET'])
def get_session_status():
    ip_address = request.remote_addr
    
    # Ищем пользоваеля по IP
    subject = None
    for s in subjects_db.values():
        if s['ipAddress'] == ip_address:
            subject = s
            break
    
    if not subject:
        return jsonify({
            'state': 'not_registered',
            'message': 'Пользователь не зарегистрирован'
        })
    
    # Проверяем статус сессии
    session_data = sessions_db.get(subject['id'])
    if not session_data:
        return jsonify({
            'state': 'waiting',
            'message': 'Ожидание начала сессии'
        })
    
    return jsonify({
        'state': session_data['state'],
        'blocks': session_data.get('blocks', []),
        'currentBlock': session_data.get('currentBlock'),
        'message': session_data.get('message', '')
    })

@app.route('/api/subjects/<subject_id>/start-session', methods=['POST'])
def start_session(subject_id):
    if subject_id in subjects_db:
        subjects_db[subject_id]['status'] = 'in_progress'
        subjects_db[subject_id]['lastActivity'] = datetime.datetime.now().isoformat()
        
        # Создаем сессию
        sessions_db[subject_id] = {
            'state': 'running',
            'blocks': [],  # Здесь будут блоки сессии
            'currentBlock': 0,
            'startTime': datetime.datetime.now().isoformat()
        }
        
        return jsonify({'status': 'success'})
    return jsonify({'error': 'Subject not found'}), 404

@app.route('/api/subjects/<subject_id>/stop-session', methods=['POST'])
def stop_session(subject_id):
    if subject_id in subjects_db:
        subjects_db[subject_id]['status'] = 'completed'
        subjects_db[subject_id]['lastActivity'] = datetime.datetime.now().isoformat()
        subjects_db[subject_id]['sessionsCount'] += 1
        return jsonify({'status': 'success'})
    return jsonify({'error': 'Subject not found'}), 404

@app.route('/api/subjects/<subject_id>/restart-session', methods=['POST'])
def restart_session(subject_id):
    if subject_id in subjects_db:
        subjects_db[subject_id]['status'] = 'waiting'
        subjects_db[subject_id]['lastActivity'] = datetime.datetime.now().isoformat()
        return jsonify({'status': 'success'})
    return jsonify({'error': 'Subject not found'}), 404

@app.route('/api/admin/reset', methods=['POST'])
def reset_system():
    try:
        db.reset_all_tables()
        return jsonify({'status': 'success'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/status-types', methods=['GET'])
def get_status_types():
    status_types = db.get_all_status_types()
    return jsonify([{
        'code': st[0],
        'description': st[1]
    } for st in status_types])

@app.route('/api/subjects/enter', methods=['POST'])
def subject_enter():
    """Вызывается когда пользователь заходит на траницу"""
    try:
        ip_address = request.remote_addr
        
        # Убеждаемся что запись существует
        subject_id = db.ensure_subject_exists(ip_address)
        
        if subject_id:
            # Проверяем текущий статус
            current_state = db.get_subject_current_state(ip_address)
            
            # Обновляем статус только если он 'not_connected'
            if current_state and current_state['status'] == 'not_connected':
                db.update_subject_status(ip_address, 'registration')
            
            return jsonify({'status': 'success', 'subject_id': subject_id})
        
        return jsonify({'error': 'Failed to initialize subject'}), 400
    except Exception as e:
        print(f"Error in subject_enter: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/subjects/start-consent', methods=['POST'])
def start_consent():
    """Вызывается пи переходе к чтению оглашения"""
    ip_address = request.remote_addr
    
    if db.update_subject_status(ip_address, 'reading_consent'):
        return jsonify({'status': 'success'})
    return jsonify({'error': 'Failed to update status'}), 400

@app.route('/api/subjects/accept-consent', methods=['POST'])
def accept_consent():
    """Вызывается при принятии соглашения"""
    ip_address = request.remote_addr
    
    if db.update_subject_status(ip_address, 'accepted_consent'):
        # Сразу меняем статус на ожидание сессии
        db.update_subject_status(ip_address, 'waiting_session')
        return jsonify({'status': 'success'})
    return jsonify({'error': 'Failed to update status'}), 400

@app.route('/api/subjects/current-state', methods=['GET'])
def get_current_state():
    """Получение текущего состояния пользователя"""
    ip_address = request.remote_addr
    
    try:
        # Получаем последний статус пользователя
        subject = db.get_subject_current_state(ip_address)
        if not subject:
            return jsonify({
                'step': 'registration',
                'fullName': None,
                'avatar': None
            })
            
        return jsonify({
            'step': determine_step(subject['status']),
            'fullName': subject['full_name'],
            'avatar': subject['avatar']
        })
    except Exception as e:
        print(f"Error getting current state: {e}")
        return jsonify({'error': str(e)}), 500

def determine_step(status):
    """Определяет текущий шаг на основе статуса"""
    status_to_step = {
        'not_connected': 'registration',
        'registration': 'registration',
        'reading_consent': 'info',
        'accepted_consent': 'measurement',
        'waiting_session': 'waiting',
        'ready_to_start': 'ready',
        'in_session': 'running',
        'finished_session': 'finished'
    }
    return status_to_step.get(status, 'registration')

@app.route('/api/session/save', methods=['POST'])
def save_session():
    try:
        data = request.json
        blocks = data.get('blocks')
        session_id = data.get('session_id')
        
        if not blocks:
            return jsonify({'error': 'No blocks provided'}), 400
        
        # Проверяем валидность типов блоков
        for block in blocks:
            if block['type'] not in VALID_BLOCK_TYPES:
                return jsonify({'error': f'Invalid block type: {block["type"]}'}), 400
        
        if session_id:
            db.update_session(session_id, blocks)
            return jsonify({
                'status': 'success',
                'session': {
                    'id': session_id,
                    'blocks': blocks
                }
            })
        else:
            new_session_id = db.save_session(blocks)
            return jsonify({
                'status': 'success',
                'session': {
                    'id': new_session_id,
                    'blocks': blocks
                }
            })
            
    except Exception as e:
        print(f"Error in save_session: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/session/active', methods=['GET'])
def get_active_session():
    try:
        session = db.get_active_session()
        return jsonify({'session': session})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/session/clear', methods=['POST'])
def clear_sessions():
    try:
        db.clear_sessions()
        return jsonify({'status': 'success'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/session/last', methods=['GET'])
def get_last_session():
    """Получает последнюю сохранённую сессию"""
    try:
        session = db.get_last_session()
        return jsonify({'session': session})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/subjects/<subject_id>', methods=['DELETE'])
def delete_subject(subject_id):
    try:
        db.delete_subject(subject_id)
        return jsonify({'status': 'success'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/admin/sessions', methods=['GET'])
def get_all_sessions():
    try:
        sessions = db.get_all_sessions()
        return jsonify(sessions)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/session/update-duration', methods=['POST'])
def update_block_duration():
    try:
        data = request.json
        block_id = data.get('blockId')
        duration = data.get('duration')
        
        print(f"Обновление длительности: blockId={block_id}, duration={duration}")
        
        if not block_id or duration is None:
            return jsonify({'error': 'Missing required fields'}), 400
            
        db.update_block_duration(block_id, duration)
        return jsonify({'status': 'success'})
    except Exception as e:
        print(f"Error in update_block_duration: {str(e)}")
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000) 