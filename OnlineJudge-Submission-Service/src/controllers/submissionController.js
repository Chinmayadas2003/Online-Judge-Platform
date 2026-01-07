async function pingRequest(req, res) {

    console.log(this.testService);

    const response = await this.testService.pingCheck();
    return res.send({data: response});
}

// TODO: Add validastion layer
async function createSubmission(req, res) {
    try {
        console.log('createSubmission payload:', req.body);

        // normalize common client field variants
        const body = req.body || {};
        if (body.userID && !body.userId) body.userId = body.userID;

        const response = await this.submissionService.addSubmission(body);
        return res.status(201).send({
            error: {},
            data: response,
            success: true,
            message: 'Created submission successfully'
        });
    } catch (err) {
        // Log the error server-side and return a helpful message to the client
        console.error('Error in createSubmission:', err);
        // If it's a mongoose validation error, return 400 with details
        if (err.name === 'ValidationError') {
            return res.status(400).send({ success: false, error: err.message });
        }
        return res.status(500).send({ success: false, error: 'Internal server error' });
    }

}

module.exports =  {
    pingRequest,
    createSubmission
};