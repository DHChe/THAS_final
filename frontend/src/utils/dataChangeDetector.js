export class DataChangeDetector {
  static generateQuickHash(data) {
    let hash = {
      count: data.length,
      lastUpdateTime: 0,
      contentHash: 0
    };

    for (let i = 0; i < data.length; i++) {
      const record = data[i];
      // 급여 데이터의 주요 필드들을 포함한 해시 생성
      const recordHash = `${record.payment_id}:${record.employee_id}:${record.payment_date}:${record.gross_salary}:${record.update_date || ''}`;
      // djb2 해시 알고리즘 사용
      hash.contentHash = ((hash.contentHash << 5) + hash.contentHash) + recordHash.length;
      
      // 업데이트 시간 추적
      const updateTime = record.update_date ? new Date(record.update_date).getTime() : 0;
      hash.lastUpdateTime = Math.max(hash.lastUpdateTime, updateTime);
    }

    return hash;
  }

  static async isDataChanged(newData, cachedHash) {
    console.time('변경 감지');
    try {
      // 빠른 검사: 레코드 수 비교
      if (!cachedHash || newData.length !== cachedHash.count) {
        console.log('데이터 수량 변경 감지됨');
        return true;
      }

      // 데이터 해시 생성 및 비교
      const newHash = this.generateQuickHash(newData);
      
      // 최종 업데이트 시간 비교
      if (newHash.lastUpdateTime > cachedHash.lastUpdateTime) {
        console.log('데이터 업데이트 시간 변경 감지됨');
        return true;
      }

      // 컨텐츠 해시 비교
      if (newHash.contentHash !== cachedHash.contentHash) {
        console.log('데이터 내용 변경 감지됨');
        return true;
      }

      return false;
    } finally {
      console.timeEnd('변경 감지');
    }
  }

  static isCacheValid() {
    try {
      // 필수 캐시 키 확인
      const requiredKeys = ['payroll_vectors', 'vectors_count', 'data_hash'];
      const missingKey = requiredKeys.find(key => !localStorage.getItem(key));
      
      if (missingKey) {
        console.log(`캐시 무효: ${missingKey} 없음`);
        return false;
      }

      // 캐시 만료 확인
      const cacheTimestamp = localStorage.getItem('cache_timestamp');
      if (!cacheTimestamp) {
        console.log('캐시 타임스탬프 없음');
        return false;
      }

      const CACHE_EXPIRY_HOURS = 24;
      const expiryTime = new Date(cacheTimestamp).getTime() + (CACHE_EXPIRY_HOURS * 60 * 60 * 1000);
      
      if (Date.now() > expiryTime) {
        console.log('캐시 만료됨');
        return false;
      }

      return true;
    } catch (error) {
      console.error('캐시 유효성 검사 실패:', error);
      return false;
    }
  }
} 