module.exports = {
	apps: [
		{
			name: 'gardenia',
			script: './src/index.js',
			env: {
				NODE_ENV: 'production',
			},
			max_memory_restart: '800M',
		},
	],
}
