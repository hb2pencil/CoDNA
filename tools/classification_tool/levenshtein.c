/* Program: Levenshtein distance tool.
 * Author: Henry Brausen (hbrausen@ualberta.ca)
 * Purpose: Calculates the Levenshtein distance between two documents, given as arguments.
 *   Take care to use the same line endings in each file -- \r\n is seen as two characters!
 * Date: May 17th, 2012
 */
#include <stdio.h>
#include <stdlib.h>

typedef struct {
	char *A;
	int lenA;
	char *B;
	int lenB;
} compare_t;

typedef struct {
	char *text;
	int len;
} filedata_t;

int min3(int a, int b, int c);
filedata_t loadFile(const char* path);
compare_t loadFromFiles(const char* pathA, const char*pathB);
int computeLevenshtein(compare_t comp);
int computeLevenshtein2(compare_t comp);

int main(int argc, char **argv)
{
	// Check argument count.
	if (argc != 3) {
		fprintf(stderr, "%s: Error: Incorrect number of arguments!\n", argv[0]);
		exit(1);
	}

	// Attempt to load revisions to compare.
	compare_t comp = loadFromFiles(argv[1], argv[2]);


	// Check that we retrieved both revisions successfully.
	if (comp.A == NULL) {
		fprintf(stderr, "%s: Error: Could not load revision A at %s\n", argv[0], argv[1]);
		exit(1);
	}

	if (comp.B == NULL) {
		fprintf(stderr, "%s: Error: Could not load revision B at %s\n", argv[0], argv[2]);
		exit(1);
	}

	printf("%d\n", computeLevenshtein2(comp));

	return 0;
}

filedata_t loadFile(const char* path)
{
	FILE *fp;

	filedata_t ret;
	ret.text = NULL;

	// Open file and check if it worked.
	if ((fp = fopen(path, "rb")) == NULL) {
		fprintf(stderr, "Could not open file %s for reading!\n", path);
		return ret;
	}

	// Grab file size
	fseek(fp, 0L, SEEK_END);
	ret.len = ftell(fp);
	fseek(fp, 0L, SEEK_SET);

	ret.text = (char *)malloc((ret.len+1)*sizeof(char));

	fread(ret.text, sizeof(char), ret.len, fp);
	ret.text[ret.len] = '\0';	// Just to be safe.
	fclose(fp);
	return ret;
}

compare_t loadFromFiles(const char* pathA, const char* pathB)
{
	compare_t ret;
	ret.A = ret.B = NULL;

	filedata_t fileA = loadFile(pathA);
	if (fileA.text == NULL) return ret;

	ret.A = fileA.text;
	ret.lenA = fileA.len;

	filedata_t fileB = loadFile(pathB);
	if (fileB.text == NULL) return ret;
	
	ret.B = fileB.text;
	ret.lenB = fileB.len;

	return ret;
}

// Low-memory version!
int computeLevenshtein2(compare_t comp)
{
	int **mat;
	int i, j;
	mat = (int **)malloc((2)*sizeof(int *));
	for (i = 0; i < 2; ++i) {
		mat[i] = (int *)malloc((comp.lenA + 1)*sizeof(int));
		mat[i][0] = i;
	}
	for (i = 0; i < comp.lenA + 1; ++i) {
		mat[0][i] = i;
	}

	for (i = 1; i < comp.lenB + 1; ++i) {
		for (j = 1; j < comp.lenA + 1; ++j) {
			if (comp.A[j-1] == comp.B[i-1])
				mat[1][j] = mat[0][j-1];
			else
				mat[1][j] = min3(mat[0][j] + 1, mat[1][j-1] + 1, mat[0][j-1] + 1);
		}
		for (j = 0; j < comp.lenA + 1; ++j) {
			mat[0][j] = mat[1][j];
		}
		mat[1][0] = i+1;
	}

	int ret = mat[0][comp.lenA];

	for (i = 0; i < 2; ++i)
		free(mat[i]);
	free(mat);

	return ret;
}

int computeLevenshtein(compare_t comp)
{
	int **mat;
	mat = (int **)malloc((comp.lenB + 1)*sizeof(int *));
	for (int i = 0; i < comp.lenB + 1; ++i) {
		mat[i] = (int *)malloc((comp.lenA + 1)*sizeof(int));
		mat[i][0] = i;
	}
	for (int i = 0; i < comp.lenA + 1; ++i) {
		mat[0][i] = i;
	}

	for (int i = 1; i < comp.lenB + 1; ++i) {
		for (int j = 1; j < comp.lenA + 1; ++j) {
			if (comp.A[j-1] == comp.B[i-1])
				mat[i][j] = mat[i-1][j-1];
			else
				mat[i][j] = min3(mat[i-1][j] + 1, mat[i][j-1] + 1, mat[i-1][j-1] + 1);
		}
	}

	int ret = mat[comp.lenB][comp.lenA];

	/*for (int i = 0; i < comp.lenB + 1; ++i) {
		for (int j = 0; j < comp.lenA + 1; ++j) {
			printf("%d ", mat[i][j]);
		}
		printf("\n");
	}*/

	for (int i = 0; i < comp.lenB + 1; ++i)
		free(mat[i]);
	free(mat);

	return ret;
}

int min3(int a, int b, int c)
{
	if (a < b && a < c)
		return a;
	if (b < c)
		return b;
	return c;
}
