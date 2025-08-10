// MCPサーバーのtools/listをテストして整形されたJSONで出力するスクリプト
const { spawn } = require('child_process');

const testToolsList = () => {
  const child = spawn('node', ['build/index.js'], {
    stdio: ['pipe', 'pipe', 'pipe']
  });

  const request = {
    jsonrpc: "2.0",
    id: 1,
    method: "tools/list"
  };

  child.stdin.write(JSON.stringify(request) + '\n');
  child.stdin.end();

  let output = '';
  child.stdout.on('data', (data) => {
    output += data.toString();
  });

  child.stderr.on('data', (data) => {
    console.error('STDERR:', data.toString());
  });

  child.on('close', (code) => {
    try {
      // ログメッセージを除外してJSONレスポンスのみを抽出
      const lines = output.split('\n');
      const jsonLine = lines.find(line => line.startsWith('{') && line.includes('"result"'));
      
      if (jsonLine) {
        const response = JSON.parse(jsonLine);
        console.log('=== MCP Server Tools List ===');
        console.log(JSON.stringify(response, null, 2));
        
        console.log(`\n=== Tools Summary ===`);
        console.log(`\nFound ${response.result.tools.length} tools:\n`);
        
        response.result.tools.forEach((tool, index) => {
          console.log(`${index + 1}. Tool: ${tool.name}`);
          console.log(`   Description: ${tool.description}`);
          
          const schema = tool.inputSchema;
          const properties = schema.properties || {};
          const required = schema.required || [];
          
          if (Object.keys(properties).length > 0) {
            console.log('   Parameters:');
            Object.entries(properties).forEach(([paramName, paramDef]) => {
              const isRequired = required.includes(paramName);
              const type = paramDef.type || 'unknown';
              const requiredText = isRequired ? '(required)' : '(optional)';
              const defaultValue = paramDef.default !== undefined ? ` (default: ${paramDef.default})` : '';
              
              console.log(`     - ${paramName}: ${type} ${requiredText}${defaultValue}`);
              if (paramDef.description) {
                console.log(`       ${paramDef.description}`);
              }
            });
          } else {
            console.log('   Parameters:');
          }
          console.log('');
        });
      } else {
        console.log('JSON response not found in output:', output);
      }
    } catch (error) {
      console.error('Error parsing JSON:', error);
      console.log('Raw output:', output);
    }
  });
};

testToolsList();
