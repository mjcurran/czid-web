require 'rails_helper'

RSpec.describe UserFactoryService do
  let!(:admin_user) { create(:admin) }
  let(:new_user_email) { "user_factory_user@email.com" }
  let(:project_id) { nil }
  let(:send_activation) { false }
  let(:new_user_params) do
    {
      name: "UserFactory User",
      email: new_user_email,
      role: 1,
      created_by_user_id: admin_user.id,
    }
  end

  let(:auth0_user_id) { "1" }

  let(:user_factory_instance) do
    described_class.new({
                          current_user: admin_user,
                          project_id: project_id,
                          send_activation: send_activation,
                          **new_user_params,
                        })
  end

  before do
    allow(MetricUtil).to receive(:post_to_airtable)
    allow(Auth0UserManagementHelper).to receive(:create_auth0_user).and_return(
      { "user_id" => auth0_user_id }
    )
  end

  context "when create is not successful" do
    before do
      allow(User).to receive(:create!).and_raise(ActiveRecord::RecordInvalid)
    end

    it "does not add a new user" do
      expect { user_factory_instance.call }.to raise_error(ActiveRecord::RecordInvalid).and change { User.count }.by(0)
      expect(User.last.id).to eq(admin_user.id)
    end

    it "logs an error" do
      expect(LogUtil).to receive(:log_error)
      expect { user_factory_instance.call }.to raise_error(ActiveRecord::RecordInvalid)
    end
  end

  context "when create is successful" do
    it "adds a new user" do
      expect { user_factory_instance.call }.to change { User.count }.by(1)
      expect(User.last).to have_attributes(**new_user_params)
    end

    context "when new user email has capital letters" do
      let(:new_user_email) { "CAPITAL_letters@EmAil.com" }
      it "downcases the email" do
        user_factory_instance.call
        expect(User.last.email).to eq("capital_letters@email.com")
      end
    end
  end

  context "#record_new_user_in_airtable" do
    let(:airtable_accounts_table) { "CZ ID Accounts" }

    context "when signup is not through a project" do
      it "make API call to add info to airtable with General signupPath" do
        user_factory_instance.call
        created_user = User.last
        airtable_data = {
          fields: {
            name: created_user.name,
            email: created_user.email,
            signupPath: "General",
            userId: created_user.id,
          },
        }

        expect(MetricUtil).to have_received(:post_to_airtable)
          .with(airtable_accounts_table, airtable_data.to_json)
      end
    end

    context "when signup is through a project" do
      let(:project_id) { create(:project).id }

      it "make API call to add info to airtable with General signupPath" do
        user_factory_instance.call
        created_user = User.last
        airtable_data = {
          fields: {
            name: created_user.name,
            email: created_user.email,
            signupPath: "Project",
            userId: created_user.id,
          },
        }

        expect(MetricUtil).to have_received(:post_to_airtable)
          .with(airtable_accounts_table, airtable_data.to_json)
      end
    end

    context "when airtable signup raises an error" do
      before do
        allow(MetricUtil).to receive(:post_to_airtable).and_raise("airtable error")
      end

      it "logs error" do
        expect(LogUtil).to receive(:log_error)
        user_factory_instance.call
      end
    end
  end

  context "#create_auth0_user_and_save_user_id" do
    it "creates auth0 user" do
      user_factory_instance.call
      created_user = User.last

      expect(Auth0UserManagementHelper).to have_received(:create_auth0_user).with(
        email: created_user.email,
        name: created_user.name,
        role: created_user.role
      )
    end

    it "sets auth0_user_id from response" do
      user_factory_instance.call
      expect(user_factory_instance.auth0_user_id).to eq(auth0_user_id)
    end

    context "when create auth0 user raises an error" do
      before do
        allow(Auth0UserManagementHelper).to receive(:create_auth0_user).and_raise("auth0 error")
      end

      it "logs error and does not create a user" do
        expect(LogUtil).to receive(:log_error)
        expect { user_factory_instance.call }.to raise_error("auth0 error") and change { User.count }.by(0)
      end
    end
  end

  context "#send_activation_email" do
    context "when send_activation is false" do
      it "does not call send_activation_email" do
        user_factory_instance.call
        expect(Auth0UserManagementHelper).not_to receive(:get_auth0_password_reset_token)
      end
    end

    context "when send_activation is true" do
      let(:send_activation) { true }
      let(:auth0_reset_url) { "auth0_ticket_reset_url" }

      before do
        allow(Auth0UserManagementHelper).to receive(:get_auth0_password_reset_token).and_return(
          { "ticket" => auth0_reset_url }
        )
        email_message = instance_double(ActionMailer::MessageDelivery)
        allow(email_message).to receive(:deliver_now)
        allow(UserMailer).to receive(:new_auth0_user_new_project).and_return(email_message)
        allow(UserMailer).to receive(:account_activation).and_return(email_message)
      end

      it "gets auth0 reset token" do
        expect(Auth0UserManagementHelper).to receive(:get_auth0_password_reset_token)
        user_factory_instance.call
      end

      context "when project_id is nil" do
        it "calls UserMail.account_activate to send activation email" do
          expect(UserMailer).not_to receive(:new_auth0_user_new_project)

          user_factory_instance.call
          created_user = User.last

          expect(UserMailer).to have_received(:account_activation)
            .with(
              created_user.email,
              auth0_reset_url
            )
        end
      end

      context "when project_id is set" do
        let(:project_id) { create(:project).id }

        it "calls UserMail.new_auth0_user_new_project to send activation email" do
          expect(UserMailer).not_to receive(:account_activation)

          user_factory_instance.call
          created_user = User.last

          expect(UserMailer).to have_received(:new_auth0_user_new_project).with(
            admin_user,
            created_user.email,
            project_id,
            auth0_reset_url
          )
        end
      end

      context "when send activation email raises an error" do
        before do
          allow(UserMailer).to receive(:account_activation).and_raise(Net::SMTPAuthenticationError)
        end

        it "logs error" do
          expect(LogUtil).to receive(:log_error)
          expect { user_factory_instance.call }.to raise_error(Net::SMTPAuthenticationError)
        end
      end
    end
  end
end
