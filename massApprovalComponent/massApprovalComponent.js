import { LightningElement, api } from 'lwc';
import massApprove from '@salesforce/apex/MassApprovalController.massApprove';
import massReject from '@salesforce/apex/MassApprovalController.massReject';

export default class MassApprovalComponent extends LightningElement {
    @api recordIds;
    isSuccess = false;
    errorMessage = '';

    handleMassApproval() {
        massApprove({ recordIds: this.recordIds })
            .then(result => {
                this.isSuccess = true;
                this.errorMessage = '';
            })
            .catch(error => {
                this.isSuccess = false;
                this.errorMessage = 'An error occured during approval: ' + error.body.message;
            });
    }

    handleMassRejection() {
        massReject({ recordIds: this.recordIds })
            .then(result => {
                this.isSuccess = true;
                this.errorMessage = '';
            })
            .catch(error => {
                this.isSuccess = false;
                this.errorMessage = 'An error occured during rejection: ' + error.body.message;
            });
    }
}