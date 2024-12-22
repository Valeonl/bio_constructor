import React, { useState, useEffect } from 'react';
import './AdminSubjectsTable.css';

function AdminSubjectsTable() {
  const [subjects, setSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [statusHistory, setStatusHistory] = useState([]);
  const [filter, setFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [availableStatuses, setAvailableStatuses] = useState([]);

  useEffect(() => {
    fetchSubjects();
    fetchStatusTypes();
  }, []);

  const fetchSubjects = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/subjects');
      const data = await response.json();
      setSubjects(data);
    } catch (error) {
      console.error('Ошибка при получении данных:', error);
    }
  };

  const fetchStatusTypes = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/status-types');
      const data = await response.json();
      setAvailableStatuses(data);
    } catch (error) {
      console.error('Ошибка при получении типов статусов:', error);
    }
  };

  const fetchStatusHistory = async (subjectId) => {
    try {
      const response = await fetch(`http://localhost:5000/api/subjects/${subjectId}/history`);
      const data = await response.json();
      setStatusHistory(data);
    } catch (error) {
      console.error('Ошибка при получении истории:', error);
    }
  };

  useEffect(() => {
    if (selectedSubject) {
      fetchStatusHistory(selectedSubject.id);
    }
  }, [selectedSubject]);

  const filteredSubjects = subjects.filter(subject => {
    const matchesFilter = subject.fullName.toLowerCase().includes(filter.toLowerCase()) ||
                         subject.ipAddress.includes(filter);
    const matchesStatus = statusFilter === 'all' || subject.status === statusFilter;
    return matchesFilter && matchesStatus;
  });

  return (
    <div className="admin-subjects">
      <div className="table-controls">
        <div className="search-box">
          <input
            type="text"
            placeholder="Поиск по имени или IP..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
        </div>
        <div className="status-filter">
          <select 
            value={statusFilter} 
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">Все статусы</option>
            {availableStatuses.map(status => (
              <option key={status.code} value={status.code}>
                {status.description}
              </option>
            ))}
          </select>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>ФИО</th>
            <th>IP адрес</th>
            <th>Последняя активность</th>
            <th>Текущий статус</th>
          </tr>
        </thead>
        <tbody>
          {filteredSubjects.map(subject => (
            <tr 
              key={subject.id}
              onClick={() => setSelectedSubject(subject)}
              className={selectedSubject?.id === subject.id ? 'selected' : ''}
            >
              <td>{subject.id}</td>
              <td>{subject.fullName}</td>
              <td>{subject.ipAddress}</td>
              <td>{new Date(subject.lastActivity).toLocaleString('ru-RU')}</td>
              <td>
                <span className={`status-badge ${subject.status}`}>
                  {subject.statusDescription}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {selectedSubject && (
        <div className="status-history">
          <h3>История статусов: {selectedSubject.fullName}</h3>
          <div className="timeline">
            {statusHistory.map((record, index) => (
              <div key={index} className="timeline-item">
                <div className="timeline-date">
                  {new Date(record.timestamp).toLocaleString('ru-RU')}
                </div>
                <span className={`status-badge ${record.status}`}>
                  {record.description}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminSubjectsTable; 