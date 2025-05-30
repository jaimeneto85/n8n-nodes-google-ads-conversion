module.exports = {
	root: true,
	ignorePatterns: ['dist/', 'node_modules/', 'tests/', '*.js', '*.json'],
	overrides: [
		{
			files: ['*.ts'],
			parser: '@typescript-eslint/parser',
			rules: {
				'no-unused-vars': 'off',
				'no-undef': 'off',
				'no-case-declarations': 'off',
				'no-mixed-spaces-and-tabs': 'off',
				'no-useless-catch': 'off',
			},
		},
	],
}; 