require "rails_helper"

RSpec.describe SnapshotSamplesHelper, type: :helper do
  before do
    user = create(:user)
    project = create(:project, users: [user])
    @sample_one = create(:sample,
                         project: project,
                         pipeline_runs_data: [{ finalized: 1, job_status: PipelineRun::STATUS_CHECKED }])
    @sample_two = create(:sample,
                         project: project,
                         pipeline_runs_data: [{ finalized: 1, job_status: PipelineRun::STATUS_CHECKED }])
    @sample_three = create(:sample,
                           project: project,
                           pipeline_runs_data: [{ finalized: 1, job_status: PipelineRun::STATUS_CHECKED }])
    snapshot_content = {
      samples: [
        { @sample_one.id => { pipeline_run_id: @sample_one.first_pipeline_run.id } },
        { @sample_two.id => { pipeline_run_id: @sample_two.first_pipeline_run.id } },
      ],
    }.to_json
    @empty_snapshot_link = create(:snapshot_link,
                                  project_id: project.id,
                                  share_id: "empty_id",
                                  content: { samples: [] }.to_json)
    @snapshot_link = create(:snapshot_link,
                            project_id: project.id,
                            share_id: "test_id",
                            content: snapshot_content)
  end

  context "#samples_by_share_id" do
    describe "with an invalid share_id" do
      it "should return nil" do
        response = helper.samples_by_share_id("invalid_id")
        expect(response).to be nil
      end
    end

    describe "with a valid share_id" do
      it "should return 0 samples when the snapshot is empty" do
        response = helper.samples_by_share_id(@empty_snapshot_link.share_id)
        samples = Sample.where(id: [])
        expect(response).to eq(samples)
      end

      it "should return all samples in the snapshot" do
        response = helper.samples_by_share_id(@snapshot_link.share_id)
        samples = Sample.where(id: [@sample_one.id, @sample_two.id])
        expect(response).to eq(samples)
      end
    end
  end

  context "#snapshot_pipeline_runs_multiget" do
    describe "with an invalid share_id" do
      it "should return nil" do
        sample_ids = [@sample_one.id, @sample_two.id]
        response = helper.snapshot_pipeline_runs_multiget(sample_ids, "invalid_id")
        expect(response).to be nil
      end
    end

    describe "with an valid share_id" do
      it "should return 0 pipeline runs when sample_ids is empty" do
        sample_ids = []
        response = helper.snapshot_pipeline_runs_multiget(sample_ids, @snapshot_link.share_id)
        expect(response).to eq({})
      end

      it "should return 0 pipeline runs when the snapshot is empty" do
        sample_ids = [@sample_one.id]
        response = helper.snapshot_pipeline_runs_multiget(sample_ids, @empty_snapshot_link.share_id)
        expect(response).to eq({})
      end

      it "should return the correct pipeline runs" do
        sample_ids = [@sample_one.id]
        response = helper.snapshot_pipeline_runs_multiget(sample_ids, @snapshot_link.share_id)
        pipeline_runs_by_sample_id = { @sample_one.id => @sample_one.first_pipeline_run }
        expect(response).to eq(pipeline_runs_by_sample_id)
      end
    end
  end

  context "#snapshot_pipeline_versions" do
    it "should return 0 pipeline versions when the snapshot is empty" do
      response = helper.snapshot_pipeline_versions(@empty_snapshot_link)
      expect(response).to eq(Set[])
    end

    it "should return the correct pipeline versions" do
      response = helper.snapshot_pipeline_versions(@snapshot_link)
      pipeline_versions = Set[@sample_one.first_pipeline_run.pipeline_version, @sample_two.first_pipeline_run.pipeline_version]
      expect(response).to eq(pipeline_versions)
    end
  end

  context "#snapshot_pipeline_run_ids" do
    it "should return 0 pipeline run ids when the snapshot is empty" do
      response = helper.snapshot_pipeline_run_ids(@empty_snapshot_link)
      expect(response).to eq([])
    end

    it "should return the correct pipeline run ids" do
      response = helper.snapshot_pipeline_run_ids(@snapshot_link)
      pipeline_runs_ids = [@sample_one.first_pipeline_run.id, @sample_two.first_pipeline_run.id]
      expect(response).to eq(pipeline_runs_ids)
    end
  end

  context "#format_samples" do
    describe "for non-snapshot samples" do
      it "should return 0 formatted samples when samples is empty" do
        samples = Sample.where(id: [])
        formatted_samples = helper.format_samples(samples)
        expect(formatted_samples).to eq([])
      end

      it "should return correctly formatted samples" do
        samples = Sample.where(id: [@sample_one.id])
        formatted_samples = helper.format_samples(samples)
        first_sample = formatted_samples.first
        expect(first_sample.keys).to contain_exactly(:db_sample, :metadata, :derived_sample_output, :run_info, :uploader, :"consensus-genome")
        expect(first_sample[:derived_sample_output].keys).to contain_exactly(:host_genome_name, :pipeline_run, :project_name, :summary_stats)
        expect(first_sample[:run_info].keys).to contain_exactly(:finalized, :report_ready, :result_status_description, :total_runtime, :with_assembly)
      end
    end

    describe "for snapshot samples" do
      it "should return 0 formatted samples when samples is empty" do
        samples = Sample.where(id: [])
        formatted_samples = helper.format_samples(samples, selected_pipeline_runs_by_sample_id: {}, is_snapshot: true)
        expect(formatted_samples).to eq([])
      end

      it "should return correctly formatted samples" do
        samples = Sample.where(id: [@sample_one.id])
        sample_ids = (samples || []).map(&:id)
        pipeline_runs_by_sample_id = snapshot_pipeline_runs_multiget(sample_ids, @snapshot_link.share_id)
        formatted_samples = helper.format_samples(samples, selected_pipeline_runs_by_sample_id: pipeline_runs_by_sample_id, is_snapshot: true)
        first_sample = formatted_samples.first
        expect(first_sample.keys).to contain_exactly(:metadata, :derived_sample_output, :run_info, :uploader, :"consensus-genome")
        expect(first_sample[:derived_sample_output].keys).to contain_exactly(:host_genome_name, :project_name, :summary_stats)
        expect(first_sample[:run_info].keys).to contain_exactly(:result_status_description)
      end
    end
  end
end
