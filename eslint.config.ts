import js from '@eslint/js';
import { defineConfig, globalIgnores } from 'eslint/config';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';

export default defineConfig([
	globalIgnores(['**/.*', '**/*.json', 'dist/', 'build/', 'node_modules/', '*.yml']),
	js.configs.recommended,
	...tseslint.configs.recommended,
	{
		files: ['**/*.{js,mjs,cjs,ts,mts,cts}'],
		languageOptions: {
			globals: globals.node,
		},
		rules: {
			'no-console': 'off',
			'no-unused-vars': 'off',
			'no-empty': 'warn',
			'no-empty-function': 'warn',
			'no-extra-semi': 'error',
			'no-irregular-whitespace': 'error',
			'no-unreachable': 'error',
			'no-unused-expressions': 'error',
			'no-useless-escape': 'error',
			'no-var': 'error',
			'prefer-const': 'error',
			'no-return-await': 'error',
			'require-await': 'error',
			'no-shadow': 'error',
			'@typescript-eslint/explicit-function-return-type': 'warn',
			'@typescript-eslint/consistent-type-definitions': ['error', 'interface'],
			'no-throw-literal': 'error',
			'no-param-reassign': 'error',
			'no-constant-condition': 'error',
			'no-implicit-coercion': 'error',
			'no-self-compare': 'error',
			'no-bitwise': 'off',
			'@typescript-eslint/no-explicit-any': 'error',
			'require-atomic-updates': 'error',
			'no-duplicate-imports': 'error',
			'no-useless-constructor': 'error',
			'no-useless-return': 'error',
			'no-empty-pattern': 'error',
			eqeqeq: ['error', 'always'],
			'sort-vars': ['warn', { ignoreCase: true }],
			indent: ['error', 'tab'],
			'max-len': [
				'warn',
				{
					code: 120,
					tabWidth: 4,
					ignoreUrls: true,
					ignoreStrings: true,
					ignoreTemplateLiterals: true,
				},
			],
			yoda: 'error',
			'@typescript-eslint/no-unused-vars': [
				'warn',
				{
					argsIgnorePattern: '^_',
					varsIgnorePattern: '^_',
				},
			],
			'@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports' }],
			'@typescript-eslint/no-non-null-assertion': 'warn',
		},
	},
	prettier,
]);
