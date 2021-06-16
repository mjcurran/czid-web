require "rails_helper"

RSpec.shared_examples "private action" do |action, options = {}|
  # options:
  # * admin_only : boolean
  # * action type : ['GET', 'PUT']
  options[:action_type] ||= "GET"

  context "Joe" do
    before do
      sign_in @joe
    end

    describe "#{options[:action_type]} /#{action}" do
      context "for workflow run from own sample" do
        it options[:admin_only] ? "returns not found error" : "succeeds" do
          project = create(:project, users: [@joe])
          sample = create(:sample, project: project, user: @joe)
          workflow_run = create(:workflow_run, sample: sample, workflow: WorkflowRun::WORKFLOW[:consensus_genome])

          get action, params: { id: workflow_run.id }

          if options[:admin_only]
            # redirected to root
            expect(response).to redirect_to root_path
          else
            expect(response).to have_http_status :ok
          end
        end
      end

      context "for workflow run from another user's sample" do
        it "returns not found error" do
          project = create(:project)
          sample = create(:sample, project: project)
          workflow_run = create(:workflow_run, sample: sample, workflow: WorkflowRun::WORKFLOW[:consensus_genome])

          get action, params: { id: workflow_run.id }

          expect(response).to have_http_status :not_found
          expect(JSON.parse(response.body, symbolize_names: true)[:status]).to eq("Workflow Run not found")
        end
      end
    end
  end

  context "Admin" do
    before do
      sign_in @admin
    end

    describe "GET /#{action}" do
      context "for workflow run from own sample" do
        it "succeeds" do
          project = create(:project, users: [@admin])
          sample = create(:sample, project: project, user: @admin)
          workflow_run = create(:workflow_run, sample: sample, workflow: WorkflowRun::WORKFLOW[:consensus_genome])

          get action, params: { id: workflow_run.id }

          expect(response).to have_http_status :ok
        end
      end

      context "for workflow run from another user's sample" do
        it "succeeds" do
          project = create(:project)
          sample = create(:sample, project: project)
          workflow_run = create(:workflow_run, sample: sample, workflow: WorkflowRun::WORKFLOW[:consensus_genome])

          get action, params: { id: workflow_run.id }

          expect(response).to have_http_status :ok
        end
      end
    end
  end
end

RSpec.describe WorkflowRunsController, type: :controller do
  create_users

  context "Access control" do
    before do
      allow_any_instance_of(WorkflowRun).to receive(:rerun)
    end

    # access control tests
    include_examples "private action", :show
    include_examples "private action", :results
    include_examples "private action", :rerun, admin_only: true
  end

  # Actions that are common to all users
  with_signed_in_users(:joe, :admin) do |username|
    context "User #{username}" do
      describe "GET index for my_data domain" do
        before do
          other_user = create(:user)
          project_with_errored_sample = create(:project, users: [@user])
          errored_sample = create(:sample, project: project_with_errored_sample, upload_error: Sample::DO_NOT_PROCESS)
          @errored_workflow_run = create(:workflow_run, sample_id: errored_sample.id)

          my_projects = [
            project_with_errored_sample,
            create(:project, users: [@user], samples_data: [
                     {
                       user: @user,
                       host_genome_name: "Human",
                       metadata_fields: { collection_location: "San Francisco, USA", sample_type: "Serum" },
                       number_of_workflow_runs: 3,
                       sample_notes: "these are some sample notes",
                       name: "Test Sample 1",
                     },
                   ]),
            create(:project, users: [other_user, @user], samples_data: [{ user: @user, number_of_workflow_runs: 3 }]),
            create(:public_project, users: [@user], samples_data: [{ user: @user, number_of_workflow_runs: 2 }]),
            create(:project, users: [@user], samples_data: [{ user: @user, number_of_workflow_runs: 1 }]),
          ]

          other_user_project = create(:project, users: [other_user])
          other_user_sample = create(:sample, project: other_user_project)
          @other_user_workflow_run = create(:workflow_run, sample: other_user_sample)

          create(:public_project)
          create(:project)

          sample_ids = my_projects.map(&:sample_ids).flatten
          @expected_workflow_runs = WorkflowRun.where(sample_id: sample_ids)
        end

        it "should not see workflow runs from other users" do
          get :index, params: { domain: "my_data", mode: "basic" }

          json_response = JSON.parse(response.body)
          workflow_runs = json_response["workflow_runs"]
          workflow_run_ids = workflow_runs.map { |wr| wr["id"] }

          expect(workflow_run_ids).to_not include(@other_user_workflow_run.id)
        end

        it "sees all basic fields with 'basic' mode" do
          get :index, params: { domain: "my_data", mode: "basic" }

          json_response = JSON.parse(response.body)
          workflow_runs = json_response["workflow_runs"]
          workflow_run_ids = workflow_runs.map { |wr| wr["id"] }

          response_workflow_run = workflow_runs[0]
          expected_workflow_run = WorkflowRun.find(response_workflow_run["id"])

          expect(json_response.keys).to eq(["workflow_runs"])
          expect(workflow_runs.count).to eq(@expected_workflow_runs.count)
          expect(workflow_run_ids).to contain_exactly(*@expected_workflow_runs.pluck(:id))
          expect(response_workflow_run).to include_json(cached_results: expected_workflow_run.cached_results,
                                                        created_at: expected_workflow_run.created_at.as_json,
                                                        inputs: {
                                                          technology: expected_workflow_run.get_input("technology"),
                                                          wetlab_protocol: expected_workflow_run.get_input("wetlab_protocol"),
                                                          medaka_model: expected_workflow_run.get_input("medaka_model"),
                                                        }.as_json,
                                                        status: expected_workflow_run.status,
                                                        id: expected_workflow_run.id,
                                                        workflow: expected_workflow_run.workflow)
        end

        it "sees basic fields with sample info included with 'with_sample_info' mode" do
          get :index, params: { domain: "my_data", mode: "with_sample_info" }

          json_response = JSON.parse(response.body)
          workflow_runs = json_response["workflow_runs"]
          workflow_run_ids = workflow_runs.map { |wr| wr["id"] }

          response_workflow_run = workflow_runs[0]
          expected_workflow_run = WorkflowRun.find(response_workflow_run["id"])
          expected_sample = expected_workflow_run.sample
          expected_sample_attributes = [:id, :created_at, :host_genome_name, :name, :private_until, :project_id, :sample_notes]
          expected_sample_info = expected_sample.slice(expected_sample_attributes)
          expected_sample_info["public"] = expected_sample.project.public_access
          metadata_by_sample_id = Metadatum.by_sample_ids([expected_sample.id])

          expect(json_response.keys).to eq(["workflow_runs"])
          expect(workflow_runs.count).to eq(@expected_workflow_runs.count)
          expect(workflow_run_ids).to contain_exactly(*@expected_workflow_runs.pluck(:id))
          expect(response_workflow_run).to include_json(id: expected_workflow_run.id,
                                                        cached_results: expected_workflow_run.cached_results,
                                                        created_at: expected_workflow_run.created_at.as_json,
                                                        status: expected_workflow_run.status,
                                                        workflow: expected_workflow_run.workflow,
                                                        inputs: {
                                                          technology: expected_workflow_run.get_input("technology"),
                                                          wetlab_protocol: expected_workflow_run.get_input("wetlab_protocol"),
                                                          medaka_model: expected_workflow_run.get_input("medaka_model"),
                                                        }.as_json,
                                                        sample: {
                                                          info: expected_sample_info.as_json,
                                                          metadata: metadata_by_sample_id[expected_sample.id].as_json,
                                                          project_name: expected_sample.project.name,
                                                          uploader: { id: expected_sample.user.id, name: expected_sample.user.name }.as_json,
                                                        }.as_json)
        end

        context "when a sample upload error occurs" do
          it "sees basic fields with sample info included with 'with_sample_info' mode and a result_status_description is included" do
            get :index, params: { domain: "my_data", mode: "with_sample_info" }

            json_response = JSON.parse(response.body)
            workflow_runs = json_response["workflow_runs"]
            workflow_run_ids = workflow_runs.map { |wr| wr["id"] }

            response_workflow_run = workflow_runs.find { |wr| wr["id"] == @errored_workflow_run.id }
            expected_workflow_run = WorkflowRun.find(response_workflow_run["id"])
            expected_sample = expected_workflow_run.sample
            expected_sample_attributes = [:id, :created_at, :host_genome_name, :name, :private_until, :project_id, :sample_notes]
            expected_sample_info = expected_sample.slice(expected_sample_attributes)
            expected_sample_info["public"] = expected_sample.project.public_access
            expected_sample_info["result_status_description"] = "SKIPPED"
            metadata_by_sample_id = Metadatum.by_sample_ids([expected_sample.id])

            expect(json_response.keys).to eq(["workflow_runs"])
            expect(workflow_runs.count).to eq(@expected_workflow_runs.count)
            expect(workflow_run_ids).to contain_exactly(*@expected_workflow_runs.pluck(:id))
            expect(response_workflow_run).to include_json(id: expected_workflow_run.id,
                                                          cached_results: expected_workflow_run.cached_results,
                                                          created_at: expected_workflow_run.created_at.as_json,
                                                          status: expected_workflow_run.status,
                                                          workflow: expected_workflow_run.workflow,
                                                          inputs: {
                                                            technology: expected_workflow_run.get_input("technology"),
                                                            wetlab_protocol: expected_workflow_run.get_input("wetlab_protocol"),
                                                            medaka_model: expected_workflow_run.get_input("medaka_model"),
                                                          }.as_json,
                                                          sample: {
                                                            info: expected_sample_info.as_json,
                                                            metadata: metadata_by_sample_id[expected_sample.id].as_json,
                                                            project_name: expected_sample.project.name,
                                                            uploader: { id: expected_sample.user.id, name: expected_sample.user.name }.as_json,
                                                          }.as_json)
          end
        end
      end

      describe "GET index for public domain" do
        before do
          other_user = create(:user)
          public_projects = [
            create(:public_project, users: [@user], samples_data: [
                     {
                       user: @user,
                       host_genome_name: "Human",
                       metadata_fields: { collection_location: "San Francisco, USA", sample_type: "Serum" },
                       number_of_workflow_runs: 3,
                       sample_notes: "these are some sample notes",
                       name: "Test Sample 1",
                     },
                   ]),
            create(:public_project),
            create(:public_project, users: [@user], samples_data: [{ user: @user, number_of_workflow_runs: 1 }]),
            create(:public_project, users: [other_user], samples_data: [{ user: other_user, number_of_workflow_runs: 4 }]),
          ]

          private_project = create(:project, users: [other_user, @user])
          private_sample = create(:sample, project: private_project)
          @private_workflow_run = create(:workflow_run, sample: private_sample)
          create(:project, users: [other_user, @user], samples_data: [{ user: @user, number_of_workflow_runs: 3 }])
          create(:project, users: [@user], samples_data: [{ user: @user, number_of_workflow_runs: 1 }])
          create(:project, users: [other_user])
          create(:project)

          sample_ids = public_projects.map(&:sample_ids).flatten
          @expected_workflow_runs = WorkflowRun.where(sample_id: sample_ids)
        end

        it "should not see private workflow runs" do
          get :index, params: { domain: "public", mode: "basic" }

          json_response = JSON.parse(response.body)
          workflow_runs = json_response["workflow_runs"]
          workflow_run_ids = workflow_runs.map { |wr| wr["id"] }

          expect(workflow_run_ids).to_not include(@private_workflow_run.id)
        end

        it "sees all basic fields when 'basic' mode is specified" do
          get :index, params: { domain: "public", mode: "basic" }

          json_response = JSON.parse(response.body)
          workflow_runs = json_response["workflow_runs"]
          workflow_run_ids = workflow_runs.map { |wr| wr["id"] }

          response_workflow_run = workflow_runs[0]
          expected_workflow_run = WorkflowRun.find(response_workflow_run["id"])

          expect(json_response.keys).to eq(["workflow_runs"])
          expect(workflow_runs.count).to eq(@expected_workflow_runs.count)
          expect(workflow_run_ids).to contain_exactly(*@expected_workflow_runs.pluck(:id))
          expect(response_workflow_run).to include_json(cached_results: expected_workflow_run.cached_results,
                                                        created_at: expected_workflow_run.created_at.as_json,
                                                        inputs: {
                                                          technology: expected_workflow_run.get_input("technology"),
                                                          wetlab_protocol: expected_workflow_run.get_input("wetlab_protocol"),
                                                          medaka_model: expected_workflow_run.get_input("medaka_model"),
                                                        }.as_json,
                                                        status: expected_workflow_run.status,
                                                        id: expected_workflow_run.id,
                                                        workflow: expected_workflow_run.workflow)
        end

        it "sees basic fields with sample info included when 'with_sample_info' mode is specified" do
          get :index, params: { domain: "public", mode: "with_sample_info" }

          json_response = JSON.parse(response.body)
          workflow_runs = json_response["workflow_runs"]
          workflow_run_ids = workflow_runs.map { |wr| wr["id"] }

          response_workflow_run = workflow_runs[0]
          expected_workflow_run = WorkflowRun.find(response_workflow_run["id"])
          expected_sample = expected_workflow_run.sample
          expected_sample_attributes = [:id, :created_at, :host_genome_name, :name, :private_until, :project_id, :sample_notes]
          expected_sample_info = expected_sample.slice(expected_sample_attributes)
          expected_sample_info["public"] = expected_sample.project.public_access
          metadata_by_sample_id = Metadatum.by_sample_ids([expected_sample.id])

          expect(json_response.keys).to eq(["workflow_runs"])
          expect(workflow_runs.count).to eq(@expected_workflow_runs.count)
          expect(workflow_run_ids).to contain_exactly(*@expected_workflow_runs.pluck(:id))
          expect(response_workflow_run).to include_json(id: expected_workflow_run.id,
                                                        cached_results: expected_workflow_run.cached_results,
                                                        created_at: expected_workflow_run.created_at.as_json,
                                                        status: expected_workflow_run.status,
                                                        workflow: expected_workflow_run.workflow,
                                                        inputs: {
                                                          technology: expected_workflow_run.get_input("technology"),
                                                          wetlab_protocol: expected_workflow_run.get_input("wetlab_protocol"),
                                                          medaka_model: expected_workflow_run.get_input("medaka_model"),
                                                        }.as_json,
                                                        sample: {
                                                          info: expected_sample_info.as_json,
                                                          metadata: metadata_by_sample_id[expected_sample.id].as_json,
                                                          project_name: expected_sample.project.name,
                                                          uploader: { id: expected_sample.user.id, name: expected_sample.user.name }.as_json,
                                                        }.as_json)
        end
      end

      ["my_data", "public"].each do |domain|
        ["basic", "with_sample_info"].freeze.each do |mode|
          context "sample filters" do
            before do
              @project1 = create(:public_project, users: [@user], samples_data: [
                                   {
                                     user: @user,
                                     host_genome_name: "Bear",
                                     metadata_fields: { collection_location: "San Francisco, USA", sample_type: "Serum" },
                                     number_of_workflow_runs: 4,
                                     name: "Test Sample 6",
                                   },
                                   {
                                     user: @user,
                                     host_genome_name: "Cow",
                                     metadata_fields: { collection_location_v2: "New York, USA", sample_type: "Nasopharyngeal Swab" },
                                     number_of_workflow_runs: 1,
                                     name: "Test Sample 7",
                                   },
                                 ])
              @project2 = create(:public_project, users: [@user], samples_data: [
                                   {
                                     user: @user,
                                     host_genome_name: "Mosquito",
                                     metadata_fields: { collection_location: "Los Angeles, USA", sample_type: "Brain" },
                                     number_of_workflow_runs: 2,
                                     name: "Test Sample 8",
                                   },
                                 ])
              # project3 is private
              @project3 = create(:project, users: [@user], samples_data: [
                                   {
                                     user: @user,
                                     host_genome_name: "Koala",
                                     metadata_fields: { collection_location: "Indio, USA", sample_type: "CSF" },
                                     number_of_workflow_runs: 3,
                                     name: "Test Sample 9",
                                   },
                                 ])
            end

            context "filtering by time" do
              it "returns correct workflow runs in the specified time range in domain '#{domain}' with mode '#{mode}'" do
                # Workflow Runs for this spec are created in the future so the testing of #index does not get contaminated by the workflow_runs created in the 'before do' block above.
                project_in_the_future = create(:public_project, users: [@user], created_at: 3.days.from_now)
                sample_in_the_future = create(:sample, project: project_in_the_future, created_at: 3.days.from_now)
                workflow_run_in_the_future1 = create(:workflow_run, sample: sample_in_the_future, created_at: 3.days.from_now)
                workflow_run_in_the_future2 = create(:workflow_run, sample: sample_in_the_future, created_at: 4.days.from_now)
                workflow_run_in_the_future3 = create(:workflow_run, sample: sample_in_the_future, created_at: 5.days.from_now)

                workflow_run_in_the_further_future = create(:workflow_run, sample: sample_in_the_future, created_at: 10.days.from_now)

                start_date = 2.days.from_now.strftime("%Y%m%d")
                end_date = 6.days.from_now.strftime("%Y%m%d")
                get :index, params: { domain: domain, mode: mode, time: [start_date, end_date], workflow: WorkflowRun::WORKFLOW[:consensus_genome] }

                json_response = JSON.parse(response.body)

                workflow_runs = json_response["workflow_runs"]
                workflow_run_ids = workflow_runs.map { |wr| wr["id"] }
                expected_workflow_run_ids = [workflow_run_in_the_future1.id, workflow_run_in_the_future2.id, workflow_run_in_the_future3.id]

                expect(json_response.keys).to eq(["workflow_runs"])
                expect(workflow_run_ids).to contain_exactly(*expected_workflow_run_ids)
                expect(workflow_run_ids).to_not include(workflow_run_in_the_further_future.id)
              end
            end

            context "filtering by visibility" do
              it "returns correct workflow runs with public visibility in domain '#{domain}' with mode '#{mode}'" do
                get :index, params: { domain: domain, mode: mode, visibility: "public", workflow: WorkflowRun::WORKFLOW[:consensus_genome] }

                json_response = JSON.parse(response.body)

                workflow_runs = json_response["workflow_runs"]
                workflow_run_ids = workflow_runs.map { |wr| wr["id"] }
                sample_ids = WorkflowRun.where(id: workflow_run_ids).pluck(:sample_id).uniq

                expected_sample_ids = Sample.where(project_id: [@project1.id, @project2.id]).pluck(:id)
                expected_workflow_run_ids = WorkflowRun.where(sample_id: expected_sample_ids).pluck(:id)

                expect(json_response.keys).to eq(["workflow_runs"])
                expect(sample_ids).to contain_exactly(*expected_sample_ids)
                expect(workflow_run_ids).to contain_exactly(*expected_workflow_run_ids)
              end

              it "returns correct workflow runs with private visibility in domain '#{domain}' with mode '#{mode}'" do
                get :index, params: { domain: domain, mode: mode, visibility: "private", workflow: WorkflowRun::WORKFLOW[:consensus_genome] }

                json_response = JSON.parse(response.body)

                workflow_runs = json_response["workflow_runs"]
                workflow_run_ids = workflow_runs.map { |wr| wr["id"] }
                sample_ids = WorkflowRun.where(id: workflow_run_ids).pluck(:sample_id).uniq

                expected_sample_ids = domain == "my_data" ? Sample.where(project_id: @project3.id).pluck(:id).uniq : []
                expected_workflow_run_ids = WorkflowRun.where(sample_id: expected_sample_ids).pluck(:id)

                expect(json_response.keys).to eq(["workflow_runs"])
                expect(sample_ids).to contain_exactly(*expected_sample_ids)
                expect(workflow_run_ids).to contain_exactly(*expected_workflow_run_ids)
              end
            end

            context "filtering by projectId" do
              it "returns correct workflow runs belonging to the specified project in domain '#{domain}' with mode '#{mode}'" do
                get :index, params: { domain: domain, mode: mode, projectId: @project1.id, workflow: WorkflowRun::WORKFLOW[:consensus_genome] }

                json_response = JSON.parse(response.body)

                workflow_runs = json_response["workflow_runs"]
                workflow_runs_workflow = workflow_runs.map { |wr| wr["workflow"] }.uniq
                workflow_run_ids = workflow_runs.map { |wr| wr["id"] }
                sample_ids = WorkflowRun.where(id: workflow_run_ids).pluck(:sample_id).uniq

                expected_sample_ids = Sample.where(project_id: @project1.id).pluck(:id).uniq
                expected_workflow_run_ids = WorkflowRun.where(sample_id: expected_sample_ids).pluck(:id)

                expect(json_response.keys).to eq(["workflow_runs"])
                expect(workflow_runs_workflow).to eq([WorkflowRun::WORKFLOW[:consensus_genome]])
                expect(sample_ids).to contain_exactly(*expected_sample_ids)
                expect(workflow_run_ids).to contain_exactly(*expected_workflow_run_ids)
              end
            end

            context "filtering by sample host" do
              it "returns correct workflow runs in domain '#{domain}' with mode '#{mode}'" do
                get :index, params: { domain: domain, mode: mode, host: HostGenome.find_by(name: "Bear").id, workflow: WorkflowRun::WORKFLOW[:consensus_genome] }

                json_response = JSON.parse(response.body)

                workflow_runs = json_response["workflow_runs"]
                workflow_runs_workflow = workflow_runs.map { |wr| wr["workflow"] }.uniq
                workflow_run_ids = workflow_runs.map { |wr| wr["id"] }
                sample_ids = WorkflowRun.where(id: workflow_run_ids).pluck(:sample_id).uniq
                samples = Sample.where(id: sample_ids)
                sample_host_genomes = samples.map(&:host_genome_name).uniq

                expect(json_response.keys).to eq(["workflow_runs"])
                expect(workflow_runs_workflow).to eq([WorkflowRun::WORKFLOW[:consensus_genome]])
                expect(sample_host_genomes).to eq(["Bear"])
              end
            end

            context "filtering by sample location_v2" do
              it "returns correct workflow runs in domain '#{domain}' with mode '#{mode}'" do
                get :index, params: { domain: domain, mode: mode, locationV2: "New York, USA", workflow: WorkflowRun::WORKFLOW[:consensus_genome] }

                json_response = JSON.parse(response.body)

                workflow_runs = json_response["workflow_runs"]
                workflow_runs_workflow = workflow_runs.map { |wr| wr["workflow"] }.uniq
                workflow_run_ids = workflow_runs.map { |wr| wr["id"] }
                sample_ids = WorkflowRun.where(id: workflow_run_ids).pluck(:sample_id).uniq
                collection_locations = Metadatum.where(sample_id: sample_ids, key: "collection_location_v2").pluck(:string_validated_value).uniq

                expect(json_response.keys).to eq(["workflow_runs"])
                expect(workflow_runs_workflow).to eq([WorkflowRun::WORKFLOW[:consensus_genome]])
                expect(collection_locations).to eq(["New York, USA"])
              end
            end

            context "filtering by sample type" do
              it "returns the correct workflow runs in domain '#{domain}' with mode '#{mode}'" do
                get :index, params: { domain: domain, mode: mode, tissue: "Brain", workflow: WorkflowRun::WORKFLOW[:consensus_genome] }

                json_response = JSON.parse(response.body)

                workflow_runs = json_response["workflow_runs"]
                workflow_runs_workflow = workflow_runs.map { |wr| wr["workflow"] }.uniq
                workflow_run_ids = workflow_runs.map { |wr| wr["id"] }
                sample_ids = WorkflowRun.where(id: workflow_run_ids).pluck(:sample_id).uniq
                sample_types = Metadatum.where(sample_id: sample_ids, key: "sample_type").pluck(:string_validated_value).uniq

                expect(json_response.keys).to eq(["workflow_runs"])
                expect(workflow_runs_workflow).to eq([WorkflowRun::WORKFLOW[:consensus_genome]])
                expect(sample_types).to eq(["Brain"])
              end
            end
          end

          context "workflow run filters" do
            before do
              public_project = create(:public_project, users: [@user])
              create(:sample, project: public_project, name: "Test Sample 9", workflow_runs_data: [
                       { workflow: WorkflowRun::WORKFLOW[:consensus_genome] },
                       { workflow: WorkflowRun::WORKFLOW[:short_read_mngs] },
                       { workflow: WorkflowRun::WORKFLOW[:consensus_genome], deprecated: true },
                     ])
            end

            context "filtering by workflow" do
              it "returns correct and non-deprecated workflow runs in domain '#{domain}' with mode '#{mode}'" do
                get :index, params: { domain: domain, mode: mode, workflow: WorkflowRun::WORKFLOW[:consensus_genome] }

                json_response = JSON.parse(response.body)

                workflow_runs = json_response["workflow_runs"]
                has_deprecated_workflow_run = workflow_runs.map { |wr| WorkflowRun.find(wr["id"]).deprecated }.include?(true)
                workflow_runs_workflow = workflow_runs.map { |wr| wr["workflow"] }.uniq

                expect(json_response.keys).to eq(["workflow_runs"])
                expect(has_deprecated_workflow_run).to eq(false)
                expect(workflow_runs_workflow).to eq([WorkflowRun::WORKFLOW[:consensus_genome]])
              end
            end
          end
        end
      end

      ["basic", "with_sample_info"].each do |mode|
        describe "GET index for my_data domain with mode '#{mode}'" do
          before do
            other_user = create(:user)
            my_projects = [
              create(:project, users: [@user], samples_data: [{ user: @user, number_of_workflow_runs: 3 }]),
              create(:project, users: [other_user, @user], samples_data: [{ user: @user, number_of_workflow_runs: 3 }]),
              create(:public_project, users: [@user], samples_data: [{ user: @user, number_of_workflow_runs: 2 }]),
              create(:project, users: [@user], samples_data: [{ user: @user, number_of_workflow_runs: 1 }]),
            ]

            create(:project, users: [other_user])
            create(:public_project)
            create(:project)

            sample_ids = my_projects.map(&:sample_ids).flatten
            @expected_workflow_runs = WorkflowRun.where(sample_id: sample_ids)
          end

          it "sees own workflow runs" do
            get :index, params: { domain: "my_data", mode: mode }

            json_response = JSON.parse(response.body)
            workflow_runs = json_response["workflow_runs"]
            workflow_run_ids = workflow_runs.map { |wr| wr["id"] }

            expect(workflow_run_ids).to contain_exactly(*@expected_workflow_runs.pluck(:id))
          end

          it "sees own workflow runs with a list of all workflow run ids" do
            get :index, params: { domain: "my_data", mode: mode, listAllIds: true }

            json_response = JSON.parse(response.body)
            workflow_runs = json_response["workflow_runs"]
            workflow_run_ids = workflow_runs.map { |wr| wr["id"] }
            all_workflow_run_ids = json_response["all_workflow_run_ids"]

            expect(workflow_run_ids).to contain_exactly(*@expected_workflow_runs.pluck(:id))
            expect(all_workflow_run_ids).to contain_exactly(*@expected_workflow_runs.pluck(:id))
          end
        end

        describe "GET index for public domain with mode '#{mode}'" do
          before do
            other_user = create(:user)
            public_projects = [
              create(:public_project, users: [@user], samples_data: [{ user: @user, number_of_workflow_runs: 2 }]),
              create(:public_project),
              create(:public_project, users: [@user], samples_data: [{ user: @user, number_of_workflow_runs: 1 }]),
              create(:public_project, users: [other_user], samples_data: [{ user: other_user, number_of_workflow_runs: 4 }]),
            ]

            create(:project, users: [other_user, @user], samples_data: [{ user: @user, number_of_workflow_runs: 3 }])
            create(:project, users: [@user], samples_data: [{ user: @user, number_of_workflow_runs: 1 }])
            create(:project, users: [other_user])
            create(:project)

            sample_ids = public_projects.map(&:sample_ids).flatten
            @expected_workflow_runs = WorkflowRun.where(sample_id: sample_ids)
          end

          it "sees public workflow runs" do
            get :index, params: { domain: "public", mode: mode }

            json_response = JSON.parse(response.body)
            workflow_runs = json_response["workflow_runs"]
            workflow_run_ids = workflow_runs.map { |wr| wr["id"] }

            expect(workflow_run_ids).to contain_exactly(*@expected_workflow_runs.pluck(:id))
          end

          it "sees public workflow runs with a list of all workflow run ids" do
            get :index, params: { domain: "public", mode: mode, listAllIds: true }

            json_response = JSON.parse(response.body)
            workflow_runs = json_response["workflow_runs"]
            workflow_run_ids = workflow_runs.map { |wr| wr["id"] }
            all_workflow_run_ids = json_response["all_workflow_run_ids"]

            expect(workflow_run_ids).to contain_exactly(*@expected_workflow_runs.pluck(:id))
            expect(all_workflow_run_ids).to contain_exactly(*@expected_workflow_runs.pluck(:id))
          end
        end
      end
    end
  end

  context "Joe" do
    before do
      sign_in @joe
    end

    describe "GET /results" do
      before do
        @project = create(:project, users: [@joe])
        @sample = create(:sample, project: @project, user: @joe)
      end

      context "for consensus genome workflow" do
        it "returns success response" do
          workflow_run = create(:workflow_run, sample: @sample, workflow: WorkflowRun::WORKFLOW[:consensus_genome])

          get :results, params: { id: workflow_run.id }

          expect(response).to have_http_status :ok
          json = JSON.parse(response.body, symbolize_names: true)
          expect(json.keys).to contain_exactly(:coverage_viz, :quality_metrics, :taxon_info)
        end
      end

      context "for short_read_mngs pipeline" do
        it "returns not found error" do
          workflow_run = create(:workflow_run, sample: @sample, workflow: WorkflowRun::WORKFLOW[:short_read_mngs])

          get :results, params: { id: workflow_run.id }

          expect(response).to have_http_status :not_found
          expect(JSON.parse(response.body, symbolize_names: true)[:status]).to eq("Workflow Run action not supported")
        end
      end
    end

    describe "GET /zip_link" do
      before do
        project = create(:project, users: [@joe])
        @sample = create(:sample, project: project)
        @sample_without_workflow_run = create(:sample, project: project)
        @workflow_run = create(:workflow_run, sample: @sample, workflow: WorkflowRun::WORKFLOW[:consensus_genome])
      end

      it "redirects to the path generated" do
        fake_aws_link = "fake_aws_link"
        expect_any_instance_of(ConsensusGenomeWorkflowRun).to receive(:zip_link).and_return(fake_aws_link)

        get :zip_link, params: { id: @workflow_run.id }

        expect(response).to have_http_status :redirect
        expect(response.headers["Location"]).to include(fake_aws_link)
      end

      it "returns an error if no path generated" do
        get :zip_link, params: { id: @workflow_run.id }

        expect(response).to have_http_status :not_found
        expect(JSON.parse(response.body, symbolize_names: true)[:status]).to eq("Output not available")
      end
    end

    describe "POST /validate_workflow_run_ids" do
      before do
        project = create(:project, users: [@joe])
        @sample1 = create(:sample, name: "Joe's good sample", project: project, user: @joe)
        @successful_workflow_run1 = create(:workflow_run, sample: @sample1, deprecated: false, status: WorkflowRun::STATUS[:succeeded])
        @successful_workflow_run2 = create(:workflow_run, sample: @sample1, deprecated: false, status: WorkflowRun::STATUS[:succeeded])

        @sample2 = create(:sample, name: "Joe's bad sample", project: project, user: @joe)
        create(:workflow_run, sample: @sample2, deprecated: true, status: WorkflowRun::STATUS[:failed])

        other_project = create(:project, users: [@admin])
        other_sample = create(:sample, name: "Admin's sample", project: other_project, user: @admin)
        create(:workflow_run, sample: other_sample, deprecated: false, status: WorkflowRun::STATUS[:succeeded])
        create(:workflow_run, sample: other_sample, deprecated: false, status: WorkflowRun::STATUS[:running])
        create(:workflow_run, sample: other_sample, deprecated: false, status: WorkflowRun::STATUS[:failed])
      end

      it "should return workflow runs that are active and belong to the user" do
        post :validate_workflow_run_ids, params: { workflowRunIds: [@successful_workflow_run1.id, @successful_workflow_run2.id], workflow: WorkflowRun::WORKFLOW[:consensus_genome] }

        expect(response).to have_http_status(200)
        json_response = JSON.parse(response.body)

        expect(json_response["validIds"]).to contain_exactly(@successful_workflow_run1.id, @successful_workflow_run2.id)
        expect(json_response["invalidSampleNames"]).to be_empty
        expect(json_response["error"]).to be_nil
      end

      it "should filter out workflow runs that are not active and do not belong to the user" do
        post :validate_workflow_run_ids, params: { workflowRunIds: [*@sample1.workflow_runs.pluck(:id), *@sample2.workflow_runs.pluck(:id)], workflow: WorkflowRun::WORKFLOW[:consensus_genome] }

        expect(response).to have_http_status(200)
        json_response = JSON.parse(response.body)

        expect(json_response["validIds"]).to contain_exactly(@successful_workflow_run1.id, @successful_workflow_run2.id)
        expect(json_response["invalidSampleNames"]).to contain_exactly(@sample2.name)
        expect(json_response["error"]).to be_nil
      end
    end

    describe "POST /created_by_current_user" do
      before do
        project = create(:project, users: [@joe])
        @sample = create(:sample, project: project, user: @joe, workflow_runs_data: [
                           { status: WorkflowRun::STATUS[:succeeded] },
                           { status: WorkflowRun::STATUS[:created] },
                           { status: WorkflowRun::STATUS[:running] },
                         ])

        other_project = create(:project, users: [@admin])
        @other_sample = create(:sample, project: other_project, user: @admin, workflow_runs_data: [
                                 { status: WorkflowRun::STATUS[:succeeded] },
                                 { status: WorkflowRun::STATUS[:created] },
                                 { status: WorkflowRun::STATUS[:running] },
                               ])
      end

      it "returns true when all workflow runs were created by the current user" do
        workflow_run_ids = @sample.workflow_runs.pluck(:id)

        post :created_by_current_user, params: { workflowRunIds: workflow_run_ids }

        expect(response).to have_http_status(200)
        json_response = JSON.parse(response.body)

        expect(json_response.keys).to contain_exactly("created_by_current_user")
        expect(json_response["created_by_current_user"]).to eq(true)
      end

      it "returns false when workflow runs that were not created by the current user were provided" do
        workflow_run_ids = [*@sample.workflow_runs.pluck(:id), *@other_sample.workflow_runs.pluck(:id)]

        post :created_by_current_user, params: { workflowRunIds: workflow_run_ids }

        expect(response).to have_http_status(200)
        json_response = JSON.parse(response.body)

        expect(json_response.keys).to contain_exactly("created_by_current_user")
        expect(json_response["created_by_current_user"]).to eq(false)
      end
    end
  end

  context "Admin" do
    before do
      sign_in @admin
    end

    describe "PUT /rerun" do
      before do
        @project = create(:project, users: [@joe])
        @sample = create(:sample, project: @project, user: @joe)
        @workflow_run = create(:workflow_run, sample: @sample, workflow: WorkflowRun::WORKFLOW[:consensus_genome])
      end

      it "creates a new workflow run, dispatches and deprecates previous run" do
        expect(SfnCGPipelineDispatchService).to receive(:call).with(instance_of(WorkflowRun))

        put :rerun, params: { id: @workflow_run.id }

        result_workflow_runs = @sample.workflow_runs
        expect(@sample.workflow_runs.count).to eq(2)

        expect(result_workflow_runs[0].id).to eq(@workflow_run.id)
        expect(result_workflow_runs[0].deprecated).to eq(true)

        expect(result_workflow_runs[1].deprecated).to eq(false)
      end
    end
  end
end
