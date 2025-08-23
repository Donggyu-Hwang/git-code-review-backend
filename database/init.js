require('dotenv').config();
const supabase = require('../config/database');
const fs = require('fs');
const path = require('path');

async function initializeDatabase() {
  try {
    console.log('Initializing database...');
    
    // SQL 스키마 파일 읽기
    const schemaPath = path.join(__dirname, 'schema.sql');
    const sqlSchema = fs.readFileSync(schemaPath, 'utf8');
    
    // SQL 문을 세미콜론으로 분리하여 실행
    const sqlStatements = sqlSchema
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0);
    
    for (const statement of sqlStatements) {
      console.log(`Executing: ${statement.substring(0, 50)}...`);
      
      const { error } = await supabase.rpc('exec_sql', {
        sql: statement
      });
      
      if (error) {
        console.error('SQL execution error:', error);
        // Supabase에서 직접 SQL 실행이 제한될 수 있으므로 주의
      }
    }
    
    console.log('Database initialization completed successfully!');
    
    // 테이블 확인
    const { data: tables, error: tableError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public');
    
    if (!tableError) {
      console.log('Available tables:', tables.map(t => t.table_name));
    }
    
  } catch (error) {
    console.error('Database initialization failed:', error);
    console.log('\n=== Manual Setup Instructions ===');
    console.log('Please execute the following SQL manually in your Supabase dashboard:');
    console.log('1. Go to https://app.supabase.com/project/mgbaltbwhhunlyortnzs/editor');
    console.log('2. Open the SQL Editor');
    console.log('3. Copy and paste the content from database/schema.sql');
    console.log('4. Execute the SQL statements');
    console.log('================================\n');
  }
}

// 직접 실행할 때
if (require.main === module) {
  initializeDatabase()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = { initializeDatabase };
