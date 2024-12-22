import sqlite3
from datetime import datetime
import json

class Database:
    def __init__(self, db_file="subjects.db"):
        self.db_file = db_file
        self.init_db()

    def get_connection(self):
        return sqlite3.connect(self.db_file)

    def init_db(self):
        with self.get_connection() as conn:
            cursor = conn.cursor()
            
            # Таблица статусов (справочник)
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS status_types (
                    status_id INTEGER PRIMARY KEY AUTOINCREMENT,
                    status_code TEXT UNIQUE NOT NULL,
                    description TEXT NOT NULL
                )
            ''')
            
            # Таблица пользователей
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS subjects (
                    subject_id INTEGER PRIMARY KEY AUTOINCREMENT,
                    full_name TEXT NOT NULL,
                    ip_address TEXT NOT NULL,
                    avatar TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    last_activity TIMESTAMP,
                    UNIQUE(ip_address)
                )
            ''')
            
            # Таблица истории статусов
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS status_history (
                    history_id INTEGER PRIMARY KEY AUTOINCREMENT,
                    subject_id INTEGER NOT NULL,
                    status_id INTEGER NOT NULL,
                    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (subject_id) REFERENCES subjects(subject_id),
                    FOREIGN KEY (status_id) REFERENCES status_types(status_id)
                )
            ''')
            
            # Таблица для сохранённых сессий
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS saved_sessions (
                    session_id INTEGER PRIMARY KEY AUTOINCREMENT,
                    blocks TEXT NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            
            # Таблица сессий
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS sessions (
                    session_id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT,                              -- Опциональное имя сессии
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    is_active BOOLEAN DEFAULT 1,            -- Флаг активности сессии
                    creator_id TEXT                         -- ID исследователя (если понадобится)
                )
            ''')
            
            # Таблица типов блоков (справочник)
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS block_types (
                    block_type_id INTEGER PRIMARY KEY AUTOINCREMENT,
                    type_code TEXT UNIQUE NOT NULL,         -- calm, tetris, dino и т.д.
                    name TEXT NOT NULL,                     -- Человекочитаемое название
                    description TEXT,                       -- Описание блока
                    duration INTEGER DEFAULT 0              -- Длительность в секундах
                )
            ''')
            
            # Таблица блоков сессии
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS session_blocks (
                    block_id INTEGER PRIMARY KEY AUTOINCREMENT,
                    session_id INTEGER NOT NULL,
                    block_type_id INTEGER NOT NULL,
                    order_index INTEGER NOT NULL,
                    duration INTEGER NOT NULL,
                    is_last BOOLEAN DEFAULT 0,
                    FOREIGN KEY (session_id) REFERENCES sessions(session_id) ON DELETE CASCADE,
                    FOREIGN KEY (block_type_id) REFERENCES block_types(block_type_id)
                )
            ''')
            
            # Добавляем статусы если их нет
            statuses = [
                ('not_connected', 'Не подключен'),
                ('registration', 'Вводит информацию о себе'),
                ('reading_consent', 'Читает соглашение'),
                ('accepted_consent', 'Принял соглашение'),
                ('waiting_session', 'Ожидает сессии'),
                ('ready_to_start', 'Готов начать сессию'),
                ('in_session', 'Проходит сессию'),
                ('finished_session', 'Закончил сессию')
            ]
            
            cursor.executemany('''
                INSERT OR IGNORE INTO status_types (status_code, description)
                VALUES (?, ?)
            ''', statuses)
            
            # Добавляем базовые типы блоков
            block_types = [
                ('calm', 'Спокойный этап', 'Этап для расслабления и отдыха', 120),
                ('tetris', 'Игра Тетрис', 'Классическая игра Тетрис', 60),
                ('dino', 'Игра Динозаврик', 'Игра в стиле Chrome Dino', 60)
            ]
            
            cursor.executemany('''
                INSERT OR IGNORE INTO block_types (type_code, name, description, duration)
                VALUES (?, ?, ?, ?)
            ''', block_types)
            
            conn.commit()

    def register_subject(self, full_name, ip_address, avatar=None):
        with self.get_connection() as conn:
            cursor = conn.cursor()
            now = datetime.now().isoformat()
            
            try:
                # Вставляем субъекта
                cursor.execute('''
                    INSERT OR REPLACE INTO subjects (full_name, ip_address, avatar, last_activity)
                    VALUES (?, ?, ?, ?)
                ''', (full_name, ip_address, avatar, now))
                
                subject_id = cursor.lastrowid
                
                # Получаем ID статуса 'registration'
                cursor.execute('SELECT status_id FROM status_types WHERE status_code = ?', ('registration',))
                status_id = cursor.fetchone()[0]
                
                # Добавляем запись в историю статусов
                cursor.execute('''
                    INSERT INTO status_history (subject_id, status_id, timestamp)
                    VALUES (?, ?, ?)
                ''', (subject_id, status_id, now))
                
                conn.commit()
                return subject_id
            except sqlite3.Error as e:
                print(f"Database error: {e}")
                return None

    def update_subject_status(self, ip_address, status_code):
        with self.get_connection() as conn:
            cursor = conn.cursor()
            now = datetime.now().isoformat()
            
            try:
                # Получаем ID статуса
                cursor.execute('SELECT status_id FROM status_types WHERE status_code = ?', (status_code,))
                status_result = cursor.fetchone()
                if not status_result:
                    print(f"Status code not found: {status_code}")
                    return False
                status_id = status_result[0]
                
                # Получаем ID пользователя
                cursor.execute('SELECT subject_id FROM subjects WHERE ip_address = ?', (ip_address,))
                subject_result = cursor.fetchone()
                if not subject_result:
                    print(f"Subject not found for IP: {ip_address}")
                    return False
                subject_id = subject_result[0]
                
                # Обновляем время последней активности
                cursor.execute('''
                    UPDATE subjects 
                    SET last_activity = ?
                    WHERE subject_id = ?
                ''', (now, subject_id))
                
                # Добавляем новый статус
                cursor.execute('''
                    INSERT INTO status_history (subject_id, status_id, timestamp)
                    VALUES (?, ?, ?)
                ''', (subject_id, status_id, now))
                
                conn.commit()
                return True
                
            except sqlite3.Error as e:
                print(f"Database error in update_subject_status: {e}")
                return False

    def get_subject_status(self, ip_address):
        with self.get_connection() as conn:
            cursor = conn.cursor()
            
            cursor.execute('''
                SELECT s.id, s.full_name, s.avatar, sh.status, sh.timestamp
                FROM subjects s
                LEFT JOIN status_history sh ON s.id = sh.subject_id
                WHERE s.ip_address = ?
                ORDER BY sh.timestamp DESC
                LIMIT 1
            ''', (ip_address,))
            
            return cursor.fetchone()

    def get_all_subjects(self):
        with self.get_connection() as conn:
            cursor = conn.cursor()
            
            cursor.execute('''
                WITH LastStatus AS (
                    SELECT 
                        sh.subject_id,
                        st.status_code as status,
                        st.description as status_description,
                        sh.timestamp,
                        ROW_NUMBER() OVER (PARTITION BY sh.subject_id ORDER BY sh.timestamp DESC) as rn
                    FROM status_history sh
                    JOIN status_types st ON sh.status_id = st.status_id
                ),
                StatusCounts AS (
                    SELECT 
                        subject_id,
                        COUNT(*) as status_changes_count
                    FROM status_history
                    GROUP BY subject_id
                )
                SELECT 
                    s.subject_id, 
                    s.full_name, 
                    s.ip_address, 
                    s.avatar, 
                    s.last_activity,
                    ls.status,
                    ls.status_description,
                    ls.timestamp,
                    COALESCE(sc.status_changes_count, 0) as status_changes_count
                FROM subjects s
                LEFT JOIN LastStatus ls ON s.subject_id = ls.subject_id AND ls.rn = 1
                LEFT JOIN StatusCounts sc ON s.subject_id = sc.subject_id
                ORDER BY s.last_activity DESC
            ''')
            
            return [{
                'id': row[0],
                'fullName': row[1],
                'ipAddress': row[2],
                'avatar': row[3],
                'lastActivity': row[4],
                'status': row[5],
                'statusDescription': row[6],
                'statusTimestamp': row[7],
                'statusChangesCount': row[8]
            } for row in cursor.fetchall()]

    def get_subject_status_history(self, subject_id):
        with self.get_connection() as conn:
            cursor = conn.cursor()
            
            cursor.execute('''
                SELECT 
                    st.status_code as status,
                    sh.timestamp,
                    st.description,
                    ROW_NUMBER() OVER (ORDER BY sh.timestamp DESC) as row_num
                FROM status_history sh
                JOIN status_types st ON sh.status_id = st.status_id
                WHERE sh.subject_id = ?
                ORDER BY sh.timestamp DESC
            ''', (subject_id,))
            
            return [{
                'status': row[0],
                'timestamp': row[1],
                'description': row[2],
                'isLatest': row[3] == 1
            } for row in cursor.fetchall()]

    def reset_all_tables(self):
        with self.get_connection() as conn:
            cursor = conn.cursor()
            
            # Отключаем проверку внешних ключей
            cursor.execute('PRAGMA foreign_keys = OFF')
            
            # Очищаем все таблицы
            cursor.execute('DELETE FROM subjects')
            cursor.execute('DELETE FROM status_history')
            
            # Сбрасываем автоинкремент
            cursor.execute('DELETE FROM sqlite_sequence')
            
            # Включаем проверку внешних ключей
            cursor.execute('PRAGMA foreign_keys = ON')
            
            conn.commit()

    def get_status_description(self, status_code):
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('''
                SELECT description 
                FROM status_types 
                WHERE status_code = ?
            ''', (status_code,))
            result = cursor.fetchone()
            return result[0] if result else status_code

    def get_all_status_types(self):
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('SELECT status_code, description FROM status_types')
            return cursor.fetchall()

    def get_all_subjects_with_details(self):
        with self.get_connection() as conn:
            cursor = conn.cursor()
            
            cursor.execute('''
                WITH LastStatus AS (
                    SELECT 
                        sh.subject_id,
                        st.status_code,
                        st.description as status_description,
                        sh.timestamp,
                        ROW_NUMBER() OVER (PARTITION BY sh.subject_id ORDER BY sh.timestamp DESC) as rn
                    FROM status_history sh
                    JOIN status_types st ON sh.status_id = st.status_id
                )
                SELECT 
                    s.subject_id,
                    s.full_name,
                    s.ip_address,
                    s.avatar,
                    s.last_activity,
                    ls.status_code,
                    ls.status_description,
                    ls.timestamp,
                    (SELECT COUNT(*) FROM status_history WHERE subject_id = s.subject_id) as status_changes_count
                FROM subjects s
                LEFT JOIN LastStatus ls ON s.subject_id = ls.subject_id AND ls.rn = 1
                ORDER BY s.last_activity DESC
            ''')
            
            return cursor.fetchall()

    def get_subject_status_history_with_details(self, subject_id):
        with self.get_connection() as conn:
            cursor = conn.cursor()
            
            cursor.execute('''
                SELECT 
                    st.status_code,
                    sh.timestamp,
                    st.description
                FROM status_history sh
                JOIN status_types st ON sh.status_id = st.status_id
                WHERE sh.subject_id = ?
                ORDER BY sh.timestamp DESC
            ''', (subject_id,))
            
            return cursor.fetchall()

    def ensure_subject_exists(self, ip_address):
        """Создает запись для IP если её ��, со статусом 'not_connected'"""
        with self.get_connection() as conn:
            try:
                cursor = conn.cursor()
                
                # Проверяем существует ли запись
                cursor.execute('SELECT subject_id FROM subjects WHERE ip_address = ?', (ip_address,))
                result = cursor.fetchone()
                
                if not result:
                    # Создаем новую запись
                    cursor.execute('''
                        INSERT INTO subjects (ip_address, full_name, last_activity)
                        VALUES (?, '', ?)
                    ''', (ip_address, datetime.now().isoformat()))
                    
                    subject_id = cursor.lastrowid
                    
                    # Получаем ID статуса 'not_connected'
                    cursor.execute('SELECT status_id FROM status_types WHERE status_code = ?', ('not_connected',))
                    status_id = cursor.fetchone()[0]
                    
                    # Добавляем начальный статус
                    cursor.execute('''
                        INSERT INTO status_history (subject_id, status_id, timestamp)
                        VALUES (?, ?, ?)
                    ''', (subject_id, status_id, datetime.now().isoformat()))
                    
                    conn.commit()
                    return subject_id
                
                return result[0]
            except sqlite3.Error as e:
                print(f"Error in ensure_subject_exists: {e}")
                conn.rollback()
                raise

    def get_subject_current_state(self, ip_address):
        """Получает текущее состояние пользователя"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            
            cursor.execute('''
                WITH LastStatus AS (
                    SELECT 
                        sh.subject_id,
                        st.status_code as status,
                        sh.timestamp,
                        ROW_NUMBER() OVER (PARTITION BY sh.subject_id ORDER BY sh.timestamp DESC) as rn
                    FROM status_history sh
                    JOIN status_types st ON sh.status_id = st.status_id
                )
                SELECT 
                    s.subject_id,
                    s.full_name,
                    s.avatar,
                    s.last_activity,
                    ls.status
                FROM subjects s
                LEFT JOIN LastStatus ls ON s.subject_id = ls.subject_id AND ls.rn = 1
                WHERE s.ip_address = ?
            ''', (ip_address,))
            
            result = cursor.fetchone()
            if result:
                return {
                    'subject_id': result[0],
                    'full_name': result[1],
                    'avatar': result[2],
                    'last_activity': result[3],
                    'status': result[4]
                }
            return None

    def get_block_type_id(self, type_code):
        """Получает ID типа блока, создает новый тип если не существует"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            
            # Сначала пытаемся найти существующий тип
            cursor.execute('''
                SELECT block_type_id 
                FROM block_types 
                WHERE type_code = ?
            ''', (type_code,))
            
            result = cursor.fetchone()
            if result:
                return result[0]
            
            # Если тип не найден и это пользовательский блок, создаем новый
            if type_code.startswith('custom-'):
                cursor.execute('''
                    INSERT INTO block_types (type_code, name, description, duration)
                    VALUES (?, ?, ?, ?)
                ''', (type_code, 'Пользовательский блок', 'Пользовательский блок', 60))
                conn.commit()
                return cursor.lastrowid
            
            # Если тип не найден и это не пользовательский блок, возвращаем тип по умолчанию
            cursor.execute('''
                SELECT block_type_id 
                FROM block_types 
                WHERE type_code = 'custom'
            ''')
            return cursor.fetchone()[0]

    def save_session(self, blocks):
        """Сохраняет новую сессию с длительностью блоков"""
        print("\nДетальная информация о блоках:")
        for i, block in enumerate(blocks, 1):
            print(f"Блок {i}:")
            print(f"  - type: {block['type']}")
            print(f"  - duration (raw): {block.get('duration')}")
            print(f"  - duration (used): {block.get('duration', 60)}")
            print(f"  - все поля: {block}")

        total_duration = sum(block.get('duration', 60) for block in blocks)
        minutes = total_duration // 60
        seconds = total_duration % 60
        print(f"\nСохранение сессии в БД:")
        print(f"Количество блоков: {len(blocks)}")
        print("Блоки:")
        for i, block in enumerate(blocks, 1):
            print(f"  {i}. {block['type']}: {block.get('duration', 60)} сек")
        print(f"Общая длительность: {minutes} мин {seconds} сек ({total_duration} сек)\n")

        with self.get_connection() as conn:
            cursor = conn.cursor()
            try:
                # Деактивируем предыдущую активную сессию
                cursor.execute('UPDATE sessions SET is_active = 0 WHERE is_active = 1')
                
                # Создаем новую сессию
                cursor.execute('''
                    INSERT INTO sessions (created_at, modified_at, is_active)
                    VALUES (CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 1)
                ''')
                session_id = cursor.lastrowid
                
                # Добавляем блоки с их длительностью
                for index, block in enumerate(blocks):
                    block_type_id = self.get_block_type_id(block['type'])
                    duration = block.get('duration', 60)  # Берем duration из блока или 60 по умолчанию
                    
                    cursor.execute('''
                        INSERT INTO session_blocks (
                            session_id, 
                            block_type_id, 
                            order_index,
                            duration,
                            is_last
                        )
                        VALUES (?, ?, ?, ?, ?)
                    ''', (
                        session_id,
                        block_type_id,
                        index,
                        duration,
                        index == len(blocks) - 1
                    ))
                
                conn.commit()
                return session_id
            except sqlite3.Error as e:
                conn.rollback()
                print(f"Error saving session: {e}")
                raise

    def get_active_session(self):
        """Получает активную сессию с блоками и их длительностью"""
        print("Получение активной сессии")
        
        with self.get_connection() as conn:
            cursor = conn.cursor()
            
            cursor.execute('''
                SELECT 
                    s.session_id,
                    s.created_at,
                    bt.type_code,
                    bt.name,
                    sb.duration,
                    sb.block_id,
                    sb.order_index,
                    sb.is_last
                FROM sessions s
                JOIN session_blocks sb ON s.session_id = sb.session_id
                JOIN block_types bt ON sb.block_type_id = bt.block_type_id
                WHERE s.is_active = 1
                ORDER BY sb.order_index
            ''')
            
            results = cursor.fetchall()
            if not results:
                print("Активная сессия не найдена")
                return None
            
            session = {
                'id': results[0][0],
                'created_at': results[0][1],
                'blocks': [
                    {
                        'id': row[5],
                        'type': row[2],
                        'name': row[3],
                        'duration': row[4],
                        'order': row[6],
                        'is_last': bool(row[7])
                    }
                    for row in results
                ]
            }
            
            print("Получена активная сессия:", session)
            return session

    def clear_sessions(self):
        """Очищает все сессии"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            try:
                cursor.execute('DELETE FROM session_blocks')
                cursor.execute('DELETE FROM sessions')
                conn.commit()
            except sqlite3.Error as e:
                conn.rollback()
                print(f"Error clearing sessions: {e}")
                raise

    def get_last_session(self):
        """Получает последнюю сохранённую сессию"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('''
                SELECT blocks FROM saved_sessions 
                ORDER BY created_at DESC LIMIT 1
            ''')
            result = cursor.fetchone()
            return json.loads(result[0]) if result else None

    def delete_subject(self, subject_id):
        """Удаляет пользователя и все связанные с ним данные"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            try:
                # Удаляем историю статусов
                cursor.execute('DELETE FROM status_history WHERE subject_id = ?', (subject_id,))
                # Удаляем самого пользователя
                cursor.execute('DELETE FROM subjects WHERE subject_id = ?', (subject_id,))
                conn.commit()
            except sqlite3.Error as e:
                print(f"Error deleting subject: {e}")
                conn.rollback()
                raise

    def get_all_sessions(self):
        """Получает все сессии с их блоками"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            
            cursor.execute('''
                SELECT 
                    s.session_id,
                    s.created_at,
                    s.is_active,
                    bt.type_code,
                    bt.name,
                    bt.duration,
                    sb.order_index,
                    sb.is_last
                FROM sessions s
                JOIN session_blocks sb ON s.session_id = sb.session_id
                JOIN block_types bt ON sb.block_type_id = bt.block_type_id
                ORDER BY s.created_at DESC, sb.order_index
            ''')
            
            results = cursor.fetchall()
            if not results:
                return []
            
            sessions = {}
            for row in results:
                session_id = row[0]
                if session_id not in sessions:
                    sessions[session_id] = {
                        'id': session_id,
                        'created_at': row[1],
                        'is_active': bool(row[2]),
                        'blocks': []
                    }
                
                sessions[session_id]['blocks'].append({
                    'type': row[3],
                    'name': row[4],
                    'duration': row[5],
                    'order': row[6],
                    'is_last': bool(row[7])
                })
            
            return list(sessions.values())

    def update_block_duration(self, block_id, duration):
        """Обновляет длительность блока"""
        print(f"\nОбновление длительности блока:")
        print(f"  - block_id: {block_id}")
        print(f"  - new duration: {duration}")
        
        with self.get_connection() as conn:
            cursor = conn.cursor()
            try:
                # Сначала проверим текущее значение
                cursor.execute('''
                    SELECT duration 
                    FROM session_blocks 
                    WHERE block_id = ?
                ''', (block_id,))
                current = cursor.fetchone()
                print(f"  - current duration: {current[0] if current else None}")

                # Обновляем значение
                cursor.execute('''
                    UPDATE session_blocks 
                    SET duration = ? 
                    WHERE block_id = ?
                ''', (duration, block_id))
                
                print(f"  - rows affected: {cursor.rowcount}")
                conn.commit()

            except sqlite3.Error as e:
                print(f"  - error: {e}")
                conn.rollback()
                raise
  