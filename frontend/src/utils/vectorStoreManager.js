import { MemoryVectorStore } from 'langchain/vectorstores/memory';

export class VectorStoreManager {
  constructor() {
    // 1. 저장소 키 정의 (= 편의점 재고 관리 태그)
    this.STORAGE_KEYS = {
      VECTORS: 'payroll_vectors',
      COUNT: 'vectors_count',
      TIMESTAMP: 'cache_timestamp',
      DATA_VERSION: 'data_version',
      LAST_UPDATED: 'last_updated',
      DATA_HASH: 'data_hash'
    };

    // 2. 캐시 정책 설정 (= 상품별 보관 기간)
    this.CACHE_POLICIES = {
      DEFAULT: 24 * 60 * 60 * 1000,  // 24시간
      PAYROLL: 30 * 24 * 60 * 60 * 1000,  // 30일
      EMERGENCY: 1 * 60 * 60 * 1000   // 1시간
    };

    this.CURRENT_VERSION = '1.0.0';
    this.DB_NAME = 'VectorStore';
    this.STORE_NAME = 'vectors';

    console.log('VectorStoreManager 초기화됨, STORAGE_KEYS:', this.STORAGE_KEYS);
  }

  isCacheValid() {
    const validUntil = localStorage.getItem(this.STORAGE_KEYS.CACHE_VALID);
    return validUntil && new Date().getTime() < parseInt(validUntil);
  }

  setCacheValidity() {
    const validUntil = new Date().getTime() + this.CACHE_DURATION;
    localStorage.setItem(this.STORAGE_KEYS.CACHE_VALID, validUntil.toString());
  }

  async quickCheck() {
    try {
      console.log('캐시 상태 확인 시작...');
      console.log('현재 localStorage 상태:', {
        timestamp: localStorage.getItem(this.STORAGE_KEYS.TIMESTAMP),
        count: localStorage.getItem(this.STORAGE_KEYS.COUNT),
        version: localStorage.getItem(this.STORAGE_KEYS.DATA_VERSION)
      });

      // IndexedDB 데이터 존재 확인
      const hasIndexedDB = await this.checkIndexedDBData();
      console.log('IndexedDB 데이터 존재 여부:', hasIndexedDB);

      if (!hasIndexedDB) {
        console.log('IndexedDB 데이터 없음');
        return { needsUpdate: true, hasCache: false };
      }

      // 메타데이터 확인
      const timestamp = localStorage.getItem(this.STORAGE_KEYS.TIMESTAMP);
      const version = localStorage.getItem(this.STORAGE_KEYS.DATA_VERSION);

      if (!timestamp || !version) {
        console.log('필수 메타데이터 없음:', { timestamp, version });
        return { needsUpdate: true, hasCache: false };
      }

      // 캐시 유효성 검사
      const cacheAge = Date.now() - parseInt(timestamp);
      const isValid = cacheAge <= this.CACHE_POLICIES.PAYROLL;

      console.log('캐시 유효성 검사 결과:', {
        cacheAge: Math.round(cacheAge / 1000 / 60) + '분',
        isValid
      });

      return { 
        needsUpdate: !isValid, 
        hasCache: true,
        metadata: { timestamp, version }
      };
    } catch (error) {
      console.error('캐시 확인 중 오류:', error);
      return { needsUpdate: true, hasCache: false };
    }
  }

  async checkIndexedDBData() {
    try {
      const db = await this.openIndexedDB();
      const tx = db.transaction(this.STORE_NAME, 'readonly');
      const store = tx.objectStore(this.STORE_NAME);
      
      // 데이터 존재 여부만 확인
      const count = await new Promise((resolve, reject) => {
        const request = store.count();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      
      db.close();
      return count > 0;
      
    } catch (error) {
      console.error('IndexedDB 확인 실패:', error);
      return false;
    }
  }

  async openIndexedDB() {
    return new Promise((resolve, reject) => {
      console.log('IndexedDB 열기 시도...');
      const request = indexedDB.open(this.DB_NAME, 2); // 버전 번호를 2로 증가
      
      request.onerror = () => {
        console.error('IndexedDB 열기 실패:', request.error);
        reject(request.error);
      };
      
      request.onsuccess = () => {
        console.log('IndexedDB 연결 성공');
        const db = request.result;
        
        // store 존재 여부 확인
        if (!db.objectStoreNames.contains(this.STORE_NAME)) {
          console.log('스토어가 없음, DB 재생성 필요');
          db.close();
          // 버전을 높여 재시도
          return this.recreateDatabase().then(resolve).catch(reject);
        }
        
        resolve(db);
      };
      
      request.onupgradeneeded = (event) => {
        console.log('IndexedDB 스키마 업그레이드 시작');
        const db = event.target.result;
        
        // 기존 스토어가 있으면 삭제
        if (db.objectStoreNames.contains(this.STORE_NAME)) {
          console.log('기존 스토어 삭제');
          db.deleteObjectStore(this.STORE_NAME);
        }
        
        // 새 스토어 생성
        console.log('새 스토어 생성:', this.STORE_NAME);
        db.createObjectStore(this.STORE_NAME, { keyPath: 'id' });
        console.log('스키마 업그레이드 완료');
      };
    });
  }

  // DB 재생성 함수 추가
  async recreateDatabase() {
    return new Promise((resolve, reject) => {
      console.log('DB 재생성 시도...');
      
      // 기존 DB 삭제
      const deleteRequest = indexedDB.deleteDatabase(this.DB_NAME);
      
      deleteRequest.onerror = () => {
        console.error('DB 삭제 실패:', deleteRequest.error);
        reject(deleteRequest.error);
      };
      
      deleteRequest.onsuccess = () => {
        console.log('기존 DB 삭제 완료, 새 DB 생성 시작');
        
        // 새 DB 생성
        const request = indexedDB.open(this.DB_NAME, 2);
        
        request.onerror = () => reject(request.error);
        
        request.onsuccess = () => {
          console.log('새 DB 생성 완료');
          resolve(request.result);
        };
        
        request.onupgradeneeded = (event) => {
          console.log('새 DB 스키마 생성');
          const db = event.target.result;
          db.createObjectStore(this.STORE_NAME, { keyPath: 'id' });
        };
      };
    });
  }

  // 데이터 해시 생성
  hashData(payrollData, employeesData) {
    // 간단한 해시 함수
    const content = JSON.stringify({
      payrollCount: payrollData?.length || 0,
      employeesCount: employeesData?.length || 0,
      lastUpdate: new Date().toISOString()
    });
    
    return btoa(content);  // Base64 인코딩
  }

  // 벡터 스토어 저장
  async saveVectorStore(vectorStore, sourceData) {
    try {
      console.log('벡터 스토어 저장 시작...', {
        vectorStore: !!vectorStore,
        sourceData: !!sourceData
      });

      // 1. IndexedDB에 벡터 데이터 저장
      await this.saveToIndexedDB(vectorStore);
      console.log('IndexedDB 저장 완료');

      // 2. 메타데이터 저장 전 상태 확인
      console.log('현재 localStorage 상태:', {
        timestamp: localStorage.getItem(this.STORAGE_KEYS.TIMESTAMP),
        count: localStorage.getItem(this.STORAGE_KEYS.COUNT),
        version: localStorage.getItem(this.STORAGE_KEYS.DATA_VERSION)
      });

      // 3. 메타데이터 저장
      const metadata = await this.saveMetadata(vectorStore, sourceData);
      console.log('메타데이터 저장 후 상태:', {
        timestamp: localStorage.getItem(this.STORAGE_KEYS.TIMESTAMP),
        count: localStorage.getItem(this.STORAGE_KEYS.COUNT),
        version: localStorage.getItem(this.STORAGE_KEYS.DATA_VERSION)
      });

      return metadata;
    } catch (error) {
      console.error('벡터 스토어 저장 실패:', error);
      throw error;
    }
  }

  extractVectorData(memoryVectors) {
    if (!Array.isArray(memoryVectors)) {
      console.warn('memoryVectors가 배열이 아님:', typeof memoryVectors);
      return [];
    }
    
    return memoryVectors.map(vector => {
      if (!vector || !vector.embedding) {
        console.warn('벡터 값이 없음:', vector);
        return null;
      }

      return {
        id: vector.id || crypto.randomUUID(),
        values: vector.embedding,  // embedding 배열을 values로 사용
        metadata: {
          content: vector.content,
          ...vector.metadata
        }
      };
    }).filter(Boolean);  // null 값 제거
  }

  createHash(payrollData, employeesData) {
    const content = JSON.stringify({
      p: payrollData?.length || 0,
      e: employeesData?.length || 0,
      t: Date.now()
    });
    return btoa(content);
  }

  splitIntoChunks(data) {
    const chunks = [];
    const chunkSize = 500; // 한 번에 500개의 벡터씩 처리
    const vectors = data.vectors;
    
    for (let i = 0; i < vectors.length; i += chunkSize) {
      const chunk = {
        vectors: vectors.slice(i, i + chunkSize),
        meta: data.meta
      };
      chunks.push(JSON.stringify(chunk));
    }
    
    return chunks;
  }

  async saveChunks(chunks) {
    // localStorage 사용 시도
    try {
      chunks.forEach((chunk, index) => {
        localStorage.setItem(`pv_${index}`, chunk);
      });
      localStorage.setItem('pv_count', chunks.length.toString());
      localStorage.setItem('pv_timestamp', new Date().toISOString());
    } catch (e) {
      if (e.name === 'QuotaExceededError') {
        console.log('localStorage 용량 초과, IndexedDB 사용');
        await this.saveToIndexedDB(chunks);
      } else {
        throw e;
      }
    }
  }

  async saveToIndexedDB(vectorStore) {
    let db;
    try {
      console.log('IndexedDB 저장 시작...');
      
      // 1. DB 연결
      db = await this.openIndexedDB();
      
      // 2. 기존 데이터 삭제
      const clearTx = db.transaction(this.STORE_NAME, 'readwrite');
      const clearStore = clearTx.objectStore(this.STORE_NAME);
      await new Promise((resolve, reject) => {
        const clearRequest = clearStore.clear();
        clearRequest.onsuccess = () => resolve();
        clearRequest.onerror = () => reject(clearRequest.error);
      });

      // 3. 새 데이터 저장
      console.log(`총 ${vectorStore.memoryVectors.length}개 벡터 저장 시작`);
      const tx = db.transaction(this.STORE_NAME, 'readwrite');
      const store = tx.objectStore(this.STORE_NAME);

      // 벡터 순차 저장
      for (let i = 0; i < vectorStore.memoryVectors.length; i++) {
        await new Promise((resolve, reject) => {
          const request = store.put({
            id: `vector_${i}`,
            data: JSON.stringify(vectorStore.memoryVectors[i]),
            timestamp: new Date().toISOString()
          });
          
          request.onsuccess = () => {
            console.log(`벡터 ${i + 1}/${vectorStore.memoryVectors.length} 저장 완료`);
            resolve();
          };
          
          request.onerror = () => reject(request.error);
        });
      }

      // 4. 트랜잭션 완료 대기
      await new Promise((resolve, reject) => {
        tx.oncomplete = () => {
          console.log('IndexedDB 저장 완료');
          resolve();
        };
        tx.onerror = () => reject(tx.error);
      });

    } catch (error) {
      console.error('IndexedDB 저장 실패:', error);
      throw error;
    } finally {
      if (db) {
        db.close();
        console.log('IndexedDB 연결 종료');
      }
    }
  }

  clearOldCache() {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key.startsWith('pv_')) {
        localStorage.removeItem(key);
      }
    }
  }

  async openDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('VectorStore', 1);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
      request.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('vectorStore')) {
          db.createObjectStore('vectorStore');
        }
      };
    });
  }

  // 벡터 스토어 로드
  async loadVectorStore(embeddings) {
    try {
      const serializedVectors = localStorage.getItem(this.STORAGE_KEYS.VECTORS);
      if (!serializedVectors) return null;

      const vectorData = JSON.parse(serializedVectors);
      
      // 새 벡터 스토어 인스턴스 생성
      return new MemoryVectorStore(embeddings, {
        docstore: vectorData.docstore,
        embeddings: vectorData.embeddings,
        index: vectorData.index
      });
    } catch (error) {
      console.error('벡터 스토어 로드 실패:', error);
      return null;
    }
  }

  // 업데이트 필요 여부 확인
  async shouldUpdate(payrollData, employeesData) {
    try {
      const storedHash = localStorage.getItem(this.STORAGE_KEYS.DATA_HASH);
      if (!storedHash) return true;

      const currentHash = this.hashData(payrollData, employeesData);
      return storedHash !== currentHash;
    } catch (error) {
      console.error('업데이트 체크 실패:', error);
      return true; // 에러 발생 시 안전하게 업데이트 진행
    }
  }

  // 저장된 타임스탬프 확인
  getLastUpdateTimestamp() {
    return localStorage.getItem(this.STORAGE_KEYS.TIMESTAMP);
  }

  // 저장소 초기화
  clearStorage() {
    Object.values(this.STORAGE_KEYS).forEach(key => {
      localStorage.removeItem(key);
    });
  }

  // 메타데이터 저장 함수 추가
  async saveMetadata(vectorStore, sourceData) {
    try {
      console.log('메타데이터 저장 시작...');
      
      const metadata = {
        timestamp: Date.now(),
        vectorCount: vectorStore.memoryVectors?.length || 0,
        dataVersion: this.CURRENT_VERSION,
        lastUpdated: new Date().toISOString(),
        dataHash: this.generateHash(sourceData)
      };

      // 명시적으로 각 키를 저장
      localStorage.setItem(this.STORAGE_KEYS.TIMESTAMP, metadata.timestamp.toString());
      localStorage.setItem(this.STORAGE_KEYS.COUNT, metadata.vectorCount.toString());
      localStorage.setItem(this.STORAGE_KEYS.DATA_VERSION, metadata.dataVersion);
      localStorage.setItem(this.STORAGE_KEYS.LAST_UPDATED, metadata.lastUpdated);
      localStorage.setItem(this.STORAGE_KEYS.DATA_HASH, metadata.dataHash);

      console.log('메타데이터 저장 완료:', {
        저장된_키들: Object.keys(this.STORAGE_KEYS),
        저장된_값들: metadata
      });

      return metadata;
    } catch (error) {
      console.error('메타데이터 저장 실패:', error);
      console.error('저장 시도한 키:', Object.keys(this.STORAGE_KEYS));
      throw error;
    }
  }

  // 캐시 유효성 검사
  async checkCacheValidity() {
    try {
      console.log('캐시 유효성 검사 시작...');
      
      // 기본 메타데이터 로드
      const timestamp = localStorage.getItem(this.STORAGE_KEYS.TIMESTAMP);
      const version = localStorage.getItem(this.STORAGE_KEYS.DATA_VERSION);
      const hash = localStorage.getItem(this.STORAGE_KEYS.DATA_HASH);

      if (!timestamp || !version) {
        console.log('필수 메타데이터 없음');
        return { isValid: false, reason: 'NO_METADATA' };
      }

      // 버전 체크 (= 상품 리콜 체크)
      if (version !== this.CURRENT_VERSION) {
        console.log('버전 불일치');
        return { isValid: false, reason: 'VERSION_MISMATCH' };
      }

      // 유효기간 체크 (= 유통기한 체크)
      const cacheAge = Date.now() - parseInt(timestamp);
      if (cacheAge > this.CACHE_POLICIES.PAYROLL) {
        console.log('캐시 만료');
        return { isValid: false, reason: 'EXPIRED' };
      }

      console.log('캐시 유효성 확인 완료');
      return { isValid: true, metadata: { timestamp, version, hash } };
    } catch (error) {
      console.error('캐시 유효성 검사 실패:', error);
      return { isValid: false, reason: 'ERROR', error };
    }
  }

  // 데이터 해시 생성
  generateHash(data) {
    return Array.isArray(data) 
      ? data.reduce((hash, item) => hash + JSON.stringify(item).length, 0).toString()
      : JSON.stringify(data).length.toString();
  }
} 