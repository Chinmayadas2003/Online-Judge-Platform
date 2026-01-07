const { fetchProblemDetails } = require('../apis/problemAdminApi');
const SubmissionCreationError = require('../errors/submissionCreationError');
const SubmissionProducer = require('../producers/submissionQueueProducer');
class SubmissionService {
    constructor(submissionRepository) {
        // inject here
        this.submissionRepository = submissionRepository;
    }

    async pingCheck() {
        return 'pong'
    }

    async addSubmission(submissionPayload) {
        // Hit the problem admin service and fetch the problem details
        const problemId = submissionPayload.problemId;
        const userId = submissionPayload.userId;

        const problemAdminApiResponse = await fetchProblemDetails(problemId);

        if(!problemAdminApiResponse) {
            throw new SubmissionCreationError('Failed to create a submission in the repository');
        }

        // Validate problem response shape
        const problemData = problemAdminApiResponse.data;
        if (!problemData || !Array.isArray(problemData.codeStubs) || problemData.codeStubs.length === 0) {
            throw new SubmissionCreationError('Problem data does not contain any code stubs');
        }

        // Normalize language strings (trim + lowercase) to avoid mismatches like extra spaces or case differences
        const requestedLangRaw = String(submissionPayload.language || '').trim().toLowerCase();

        // Map common aliases to canonical values stored in the problem codeStubs
        const languageAliasMap = {
            'python': 'python',
            'python3': 'python',
            'py': 'python',
            'java': 'java',
            'openjdk': 'java',
            'cpp': 'cpp',
            'c++': 'cpp',
        };

        const canonicalRequested = languageAliasMap[requestedLangRaw] || requestedLangRaw;

        let languageCodeStub = problemData.codeStubs.find(codeStub => {
            const stubLang = String(codeStub.language || '').trim().toLowerCase();
            const stubCanonical = languageAliasMap[stubLang] || stubLang;
            return stubCanonical === canonicalRequested;
        });

        console.log('selected code stub:', languageCodeStub);

        let warning;
        if (!languageCodeStub) {
            // If no exact stub found, fallback to the first available stub so submissions can proceed.
            // This is a convenience for development; it will wrap the user's code with the first stub.
            languageCodeStub = problemData.codeStubs[0];
            warning = `Requested language '${submissionPayload.language}' not found. Using fallback stub for language '${languageCodeStub.language}'.`;
            console.warn(warning);
        }

        submissionPayload.code = languageCodeStub.startSnippet + "\n\n" + submissionPayload.code + "\n\n" + languageCodeStub.endSnippet;


        const submission = await this.submissionRepository.createSubmission(submissionPayload);
        if(!submission) {
            // TODO: Add error handling here
            throw new SubmissionCreationError('Failed to create a submission in the repository');
        }
        console.log(submission);
        const response = await SubmissionProducer({
            [submission._id]: {
                code: submission.code,
                language: submission.language,
                inputCase: problemAdminApiResponse.data.testCases[0].input,
                outputCase: problemAdminApiResponse.data.testCases[0].output,
                userId,
                submissionId: submission._id

            }
        });

        // TODO: Add handling of all testcases here .
        return {queueResponse: response, submission};
    }
}

module.exports = SubmissionService