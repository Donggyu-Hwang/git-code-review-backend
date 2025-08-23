-- 코드 리뷰 테이블 생성
CREATE TABLE IF NOT EXISTS code_reviews (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    github_url TEXT NOT NULL,
    repository_owner TEXT NOT NULL,
    repository_name TEXT NOT NULL,
    team_name TEXT,
    repository_language TEXT,
    repository_description TEXT,
    analysis_depth TEXT DEFAULT 'detailed' CHECK (analysis_depth IN ('basic', 'detailed', 'comprehensive')),
    include_tests BOOLEAN DEFAULT true,
    include_documentation BOOLEAN DEFAULT true,
    full_report TEXT NOT NULL,
    summary TEXT NOT NULL,
    repository_stats JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_code_reviews_github_url ON code_reviews(github_url);
CREATE INDEX IF NOT EXISTS idx_code_reviews_created_at ON code_reviews(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_code_reviews_repository_language ON code_reviews(repository_language);
CREATE INDEX IF NOT EXISTS idx_code_reviews_repository_owner ON code_reviews(repository_owner);
CREATE INDEX IF NOT EXISTS idx_code_reviews_team_name ON code_reviews(team_name);

-- 업데이트 시간 자동 갱신을 위한 함수
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 트리거 생성
CREATE TRIGGER update_code_reviews_updated_at 
    BEFORE UPDATE ON code_reviews 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- RLS (Row Level Security) 정책 설정 (선택사항)
-- ALTER TABLE code_reviews ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Public access to code_reviews" ON code_reviews FOR ALL USING (true);
